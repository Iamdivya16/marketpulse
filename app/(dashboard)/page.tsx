"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import { SylcResponse } from "@/lib/scoring/types";
import { SylcHeader } from "@/components/sylc/sylc-header";
import { AttentionCard } from "@/components/sylc/attention-card";
import { AttentionHero } from "@/components/sylc/attention-summary";
import { QuietState } from "@/components/sylc/quiet-state";
import { AcknowledgeButton } from "@/components/sylc/acknowledge-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SylcDashboardPage() {
  const [feed, setFeed] = useState<SylcResponse | null>(null);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const hasLoaded = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchFeed() {
      if (!hasLoaded.current) setLoading(true);
      setError(null);
      try {
        const [data, watchlist] = await Promise.all([api.getSylc(), api.getWatchlist()]);
        if (!cancelled) {
          setFeed(data);
          setWatchlistCount(watchlist.items.length);
          hasLoaded.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Failed to load feed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchFeed();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function handleAcknowledged() {
    setReloadKey((key) => key + 1);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  const quiet =
    feed && !feed.isFirstVisit && feed.items.length === 0 && watchlistCount > 0;

  return (
    <div className="space-y-8">
      <SylcHeader
        since={feed?.since ?? null}
        dataAsOf={feed?.dataAsOf ?? new Date().toISOString()}
        degraded={feed?.degraded ?? false}
        watchlistCount={watchlistCount}
        onAcknowledged={handleAcknowledged}
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {feed?.degraded && !error && (
        <Alert>
          <AlertTitle>Limited market data</AlertTitle>
          <AlertDescription>
            Some data sources were temporarily unavailable. Results may be partial or stale.
          </AlertDescription>
        </Alert>
      )}

      {feed && !feed.isFirstVisit && (
        <AttentionHero summary={feed.summary} isFirstVisit={feed.isFirstVisit} />
      )}

      {feed?.isFirstVisit && (
        <section className="groww-card px-5 py-6 sm:px-6">
          <p className="text-xs font-semibold text-[#00b386]">Set your baseline</p>
          <p className="mt-2 text-xl font-semibold text-[#191c27]">
            Your watchlist, already watched
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#666a7a]">
            Add symbols, then mark all as checked. Next time you open Groww, we compare the latest
            market state against that snapshot and tell you what changed — and why it matters.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <AcknowledgeButton
              disabled={watchlistCount === 0}
              onSuccess={handleAcknowledged}
              size="sm"
            />
            <Link
              href="/watchlist"
              className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-[#191c27] hover:bg-[#f5f5f5]"
            >
              Manage watchlist
            </Link>
          </div>
          {watchlistCount === 0 && (
            <p className="mt-3 text-xs text-[#666a7a]">
              Add at least one symbol before marking as checked.
            </p>
          )}
        </section>
      )}

      {quiet && (
        <QuietState watchlistSize={watchlistCount} since={feed?.since ?? null} />
      )}

      {feed && feed.items.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-[#666a7a]">
            Stocks that changed meaningfully
          </p>
          <div className="grid gap-4">
            {feed.items.map((item, index) => (
              <AttentionCard key={item.symbolId} item={item} rank={index + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
