"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { api, ApiClientError } from "@/lib/api-client";
import { PriceChart } from "@/components/stock/price-chart";
import { AcknowledgeButton } from "@/components/sylc/acknowledge-button";
import { ChangeHistory } from "@/components/sylc/change-history";
import { BaselineCompare } from "@/components/sylc/baseline-compare";
import { SignalCompareTable } from "@/components/sylc/signal-compare";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeClass, ChangeHistoryEntry, SignalContribution } from "@/lib/scoring/types";
import { formatSignedPct, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

type DetailResponse = {
  since: string | null;
  dataAsOf: string;
  degraded: boolean;
  hasSnapshot: boolean;
  symbol: { id: string; ticker: string; name: string };
  snapshot: {
    price: number;
    volume: number;
    avgVolume20d: number;
    sentimentScore: number;
    newsCount: number;
    volatilityAtr: number;
  } | null;
  current: {
    price: number;
    volume: number;
    avgVolume20d: number;
    sentimentScore: number;
    newsCount: number;
    volatilityAtr: number;
  };
  scored: {
    score: number;
    severity: "low" | "medium" | "high";
    changeClass: ChangeClass;
    activeSignals: string[];
    combinationBonus: number;
    headline: string;
    explanation: string;
    whyItMatters: string;
    contributions: SignalContribution[];
    signals: {
      priceChangePct: number;
      volumeRatio: number;
      newsCount: number;
      sentimentDelta: number;
      volatilityChangePct: number;
    };
  } | null;
  history: ChangeHistoryEntry[];
};

type NewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: number;
};

const severityCopy = {
  high: "High attention",
  medium: "Medium attention",
  low: "Quiet",
};

const severityTone = {
  high: "text-[#eb5b3c]",
  medium: "text-[#c4841d]",
  low: "text-[#00b386]",
};

export default function StockDetailPage() {
  const params = useParams<{ ticker: string }>();
  const ticker = params.ticker.toUpperCase();
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [bars, setBars] = useState<Array<{ date: string; close: number }>>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const watchlist = await api.getWatchlist();
        const item = watchlist.items.find((entry) => entry.ticker === ticker);
        if (!item) {
          setError("This symbol is not in your watchlist.");
          setLoading(false);
          return;
        }

        const [detailResult, barsResult, newsResult] = await Promise.allSettled([
          api.getSylcDetail(item.symbolId),
          api.getBars(ticker),
          api.getNews(ticker),
        ]);

        if (detailResult.status === "fulfilled") {
          setDetail(detailResult.value as DetailResponse);
        } else {
          setDetail(null);
        }

        setBars(barsResult.status === "fulfilled" ? barsResult.value.bars : []);
        setNews(newsResult.status === "fulfilled" ? newsResult.value.items : []);

        if (detailResult.status === "rejected" && barsResult.status === "rejected") {
          const err = detailResult.reason;
          setError(err instanceof ApiClientError ? err.message : "Failed to load stock detail");
        }
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Failed to load stock detail");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [ticker]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="rounded-2xl border border-[#e8e9ed] bg-white p-8">
        <p className="text-lg font-semibold text-[#191c27]">Unable to load stock</p>
        <p className="mt-2 text-sm text-[#666a7a]">{error ?? "Stock detail unavailable."}</p>
        <Link
          href="/watchlist"
          className="mt-5 inline-flex h-9 items-center justify-center rounded-full bg-[#00b386] px-4 text-sm font-semibold text-white hover:bg-[#00a078]"
        >
          Back to watchlist
        </Link>
      </div>
    );
  }

  const scored = detail.scored;
  const snapshot = detail.snapshot;
  const pct = scored?.signals.priceChangePct ?? 0;
  const currentPrice = Number(detail.current.price);
  const baselinePrice = snapshot ? Number(snapshot.price) : currentPrice;
  const hasBaseline = Boolean(scored && snapshot && detail.since);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm font-medium text-[#00b386] hover:underline">
          ← Back to dashboard
        </Link>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#191c27]">
              {detail.symbol.ticker}
            </h1>
            <p className="mt-1 text-[#666a7a]">{detail.symbol.name}</p>
            <p className="mt-4 text-4xl font-semibold tabular-nums tracking-tight text-[#191c27]">
              {formatUsd(currentPrice)}
            </p>
            {hasBaseline ? (
              <p
                className={cn(
                  "mt-1 text-sm font-medium tabular-nums",
                  pct >= 0 ? "gain" : "loss",
                )}
              >
                {formatSignedPct(pct, 2)} since last check
              </p>
            ) : (
              <p className="mt-1 text-sm text-[#666a7a]">No baseline yet — mark as checked to start tracking.</p>
            )}
          </div>
          {hasBaseline && scored ? (
            <div className="rounded-xl border px-5 py-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Attention score
              </p>
              <p className="mt-1 text-4xl font-semibold tabular-nums text-[#191c27]">
                {scored.score}
                <span className="ml-1 text-lg text-muted-foreground">/ 100</span>
              </p>
              <p className={cn("mt-1 text-sm font-medium uppercase tracking-wide", severityTone[scored.severity])}>
                {severityCopy[scored.severity]}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {detail.degraded && (
        <Alert>
          <AlertTitle>Stale or partial data</AlertTitle>
          <AlertDescription>
            Some market sources were unavailable. Data as of{" "}
            {new Date(detail.dataAsOf).toLocaleString()}.
          </AlertDescription>
        </Alert>
      )}

      {!hasBaseline && (
        <div className="rounded-2xl border border-[#d6f3eb] bg-[#eef9f6] p-6">
          <p className="text-lg font-semibold text-[#191c27]">Set a baseline to see what changed</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#666a7a]">
            Quotes can load without a last-checked snapshot. Mark all as checked to save a
            baseline, then this page can show then vs now, attention score, and why it moved.
          </p>
          <AcknowledgeButton
            className="mt-5"
            onSuccess={() => window.location.reload()}
          />
        </div>
      )}

      {hasBaseline && scored && snapshot && detail.since && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Then vs now</CardTitle>
            </CardHeader>
            <CardContent>
              <BaselineCompare
                since={detail.since}
                currentAt={detail.dataAsOf}
                baselinePrice={baselinePrice}
                currentPrice={currentPrice}
                priceChangePct={pct}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Why {detail.symbol.ticker} is getting attention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-medium">{scored.headline}</p>
              <p className="text-[15px] leading-relaxed">{scored.whyItMatters}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {scored.explanation}
              </p>
              {scored.combinationBonus > 0 && (
                <p className="text-xs text-muted-foreground">
                  Combination bonus +{scored.combinationBonus} because{" "}
                  {scored.activeSignals.join(", ")} moved together.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Compared since {formatDistanceToNow(new Date(detail.since), { addSuffix: true })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signal breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <SignalCompareTable
                snapshot={snapshot}
                current={detail.current}
                contributions={scored.contributions}
              />
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Price trend</CardTitle>
        </CardHeader>
        <CardContent>
          {bars.length > 0 ? (
            <PriceChart bars={bars} />
          ) : (
            <p className="text-sm text-muted-foreground">Chart data unavailable.</p>
          )}
        </CardContent>
      </Card>

      {hasBaseline && (
        <Card>
          <CardHeader>
            <CardTitle>Change history</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangeHistory entries={detail.history ?? []} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent headlines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {news.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent headlines cached.</p>
          ) : (
            news.map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border p-3 transition-colors hover:bg-muted"
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.source} ·{" "}
                  {formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}
                </p>
              </a>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
