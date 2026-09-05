"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { api, ApiClientError } from "@/lib/api-client";
import { WatchlistRosterItem } from "@/lib/scoring/types";
import { AcknowledgeButton } from "@/components/sylc/acknowledge-button";
import { WatchlistRow } from "@/components/watchlist/watchlist-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type WatchlistItem = {
  id: string;
  symbolId: string;
  ticker: string;
  name: string;
};

type SearchResult = {
  ticker: string;
  name: string;
};

export default function WatchlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [roster, setRoster] = useState<WatchlistRosterItem[]>([]);
  const [maxSize, setMaxSize] = useState(15);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchWatchlist() {
      if (!hasLoaded.current) setLoading(true);
      try {
        const [data, snapshot, sylc] = await Promise.all([
          api.getWatchlist(),
          api.getLatestSnapshot(),
          api.getSylc(),
        ]);
        if (!cancelled) {
          setItems(data.items);
          setMaxSize(data.maxSize);
          setLastCheckedAt(snapshot.checkedAt ?? null);
          setRoster(sylc.roster ?? []);
          hasLoaded.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Failed to load watchlist");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchWatchlist();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.searchSymbols(trimmed);
        if (!cancelled) setResults(data.results);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const rosterById = useMemo(
    () => new Map(roster.map((entry) => [entry.symbolId, entry])),
    [roster],
  );

  async function handleAdd(ticker: string, name: string) {
    setError(null);
    try {
      await api.addToWatchlist(ticker, name);
      setQuery("");
      setResults([]);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to add symbol");
    }
  }

  async function handleRemove(symbolId: string) {
    setError(null);
    try {
      await api.removeFromWatchlist(symbolId);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to remove symbol");
    }
  }

  async function handleQuickAdd(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    await handleAdd(query.trim().toUpperCase(), query.trim().toUpperCase());
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-[#00b386]">Stocks</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#191c27]">Watchlist</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#666a7a]">
            Track up to {maxSize} US symbols. Attention is measured against your last checked
            snapshot — not against the previous close.
          </p>
          <p className="mt-2 text-xs text-[#666a7a]">
            {lastCheckedAt
              ? `Last checked ${formatDistanceToNow(new Date(lastCheckedAt), { addSuffix: true })}.`
              : "No baseline yet — mark all as checked after adding symbols."}
          </p>
        </div>
        <AcknowledgeButton
          disabled={items.length === 0 || loading}
          onSuccess={() => setReloadKey((key) => key + 1)}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add symbol</CardTitle>
          <CardDescription>Search US equities or enter a ticker directly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleQuickAdd} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="symbol" className="sr-only">
                Symbol
              </Label>
              <Input
                id="symbol"
                placeholder="Search e.g. AAPL"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={items.length >= maxSize || !query.trim()}>
              Add
            </Button>
          </form>

          {searching && <p className="text-sm text-muted-foreground">Searching...</p>}

          {query.trim().length > 0 && results.length > 0 && (
            <div className="divide-y overflow-hidden rounded-lg border">
              {results.map((result) => (
                <button
                  key={result.ticker}
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted"
                  onClick={() => handleAdd(result.ticker, result.name)}
                >
                  <div>
                    <div className="font-medium">{result.ticker}</div>
                    <div className="text-sm text-muted-foreground">{result.name}</div>
                  </div>
                  <span className="text-sm text-muted-foreground">Add</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Your symbols ({items.length}/{maxSize})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed px-6 py-10 text-center">
              <p className="text-muted-foreground">No symbols yet. Add your first stock above.</p>
              <Button className="mt-4" variant="outline" onClick={() => router.push("/")}>
                Back to dashboard
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <WatchlistRow
                  key={item.id}
                  item={item}
                  roster={rosterById.get(item.symbolId)}
                  onRemove={() => handleRemove(item.symbolId)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
