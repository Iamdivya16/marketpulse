import { prisma } from "@/lib/db";
import {
  getSymbolSignals,
  snapshotFromSignals,
} from "@/lib/market-data/service";
import { scoreSymbolChange } from "@/lib/scoring/composite";
import {
  AttentionSummary,
  ChangeHistoryEntry,
  SignalCurrent,
  SignalSnapshot,
  SylcItem,
  SylcResponse,
  WatchlistRosterItem,
} from "@/lib/scoring/types";
import { toNumber } from "@/lib/market-data/cache";

const emptySummary = (watchlistSize = 0): AttentionSummary => ({
  watchlistSize,
  needingAttention: 0,
  high: 0,
  medium: 0,
  quiet: watchlistSize,
});

function rowToSnapshot(row: {
  price: unknown;
  volume: unknown;
  avgVolume20d: unknown;
  sentimentScore: unknown;
  newsCount: number;
  volatilityAtr: unknown;
}): SignalSnapshot {
  return {
    price: toNumber(row.price),
    volume: toNumber(row.volume),
    avgVolume20d: toNumber(row.avgVolume20d),
    sentimentScore: toNumber(row.sentimentScore),
    newsCount: row.newsCount,
    volatilityAtr: toNumber(row.volatilityAtr),
  };
}

function snapshotAsCurrent(snapshot: SignalSnapshot): SignalCurrent {
  return {
    ...snapshot,
    newsSinceSnapshot: [],
  };
}

function summarize(watchlistSize: number, scored: Array<{ needsAttention: boolean; severity: "low" | "medium" | "high" }>): AttentionSummary {
  let high = 0;
  let medium = 0;
  let needingAttention = 0;

  for (const item of scored) {
    if (!item.needsAttention) continue;
    needingAttention += 1;
    if (item.severity === "high") high += 1;
    else medium += 1;
  }

  return {
    watchlistSize,
    needingAttention,
    high,
    medium,
    quiet: Math.max(0, watchlistSize - needingAttention),
  };
}

export async function getLatestSnapshot(userId: string) {
  return prisma.userSnapshot.findFirst({
    where: { userId },
    orderBy: { checkedAt: "desc" },
    include: {
      symbols: true,
    },
  });
}

export async function createSnapshotForUser(userId: string) {
  const watchlist = await prisma.watchlistItem.findMany({
    where: { userId },
    include: { symbol: true },
  });

  if (watchlist.length === 0) {
    throw new Error("Add symbols to your watchlist before creating a snapshot.");
  }

  const snapshot = await prisma.userSnapshot.create({
    data: {
      userId,
      symbols: {
        create: [],
      },
    },
  });

  const since = new Date(0);
  const results = await Promise.all(
    watchlist.map(async (item) => {
      try {
        const signals = await getSymbolSignals(
          item.symbolId,
          item.symbol.ticker,
          item.symbol.name,
          since,
        );
        const current = snapshotFromSignals(signals.current);
        await prisma.snapshotSymbol.create({
          data: {
            snapshotId: snapshot.id,
            symbolId: item.symbolId,
            price: current.price,
            volume: BigInt(Math.round(current.volume)),
            avgVolume20d: current.avgVolume20d,
            sentimentScore: current.sentimentScore,
            newsCount: current.newsCount,
            volatilityAtr: current.volatilityAtr,
          },
        });
        return { ok: true as const, degraded: signals.degraded, fetchedAt: signals.fetchedAt };
      } catch (error) {
        console.error(`Failed snapshot for ${item.symbol.ticker}`, error);
        return { ok: false as const, degraded: true, fetchedAt: new Date(0) };
      }
    }),
  );

  let degraded = false;
  let latestFetch = new Date(0);
  for (const result of results) {
    degraded = degraded || result.degraded;
    if (result.fetchedAt > latestFetch) latestFetch = result.fetchedAt;
  }

  const savedCount = await prisma.snapshotSymbol.count({
    where: { snapshotId: snapshot.id },
  });
  if (savedCount === 0) {
    await prisma.userSnapshot.delete({ where: { id: snapshot.id } });
    throw new Error(
      "Could not save a market baseline. Quotes were unavailable — try again in a moment.",
    );
  }

  return { snapshotId: snapshot.id, checkedAt: snapshot.checkedAt, degraded, dataAsOf: latestFetch };
}

export async function buildSylcFeed(userId: string): Promise<SylcResponse> {
  const watchlist = await prisma.watchlistItem.findMany({
    where: { userId },
    include: { symbol: true },
    orderBy: { addedAt: "asc" },
  });

  const snapshot = await getLatestSnapshot(userId);

  if (!snapshot) {
    return {
      since: null,
      snapshotId: null,
      dataAsOf: new Date().toISOString(),
      degraded: false,
      isFirstVisit: true,
      summary: emptySummary(watchlist.length),
      items: [],
      roster: watchlist.map((item) => ({
        symbolId: item.symbolId,
        ticker: item.symbol.ticker,
        name: item.symbol.name,
        price: null,
        priceChangePct: null,
        score: null,
        severity: null,
        needsAttention: false,
      })),
    };
  }

  const snapshotMap = new Map(
    snapshot.symbols.map((row) => [row.symbolId, row]),
  );

  const scoredRows = await Promise.all(
    watchlist.map(async (item) => {
      const snapshotRow = snapshotMap.get(item.symbolId);
      if (!snapshotRow) {
        return {
          kind: "missing" as const,
          item,
        };
      }

      try {
        const signals = await getSymbolSignals(
          item.symbolId,
          item.symbol.ticker,
          item.symbol.name,
          snapshot.checkedAt,
        );
        const scored = scoreSymbolChange({
          ticker: item.symbol.ticker,
          snapshotCheckedAt: snapshot.checkedAt,
          snapshot: rowToSnapshot(snapshotRow),
          current: signals.current,
        });
        return { kind: "ok" as const, item, signals, scored };
      } catch (error) {
        console.error(`Failed SYLC for ${item.symbol.ticker}`, error);
        return { kind: "fail" as const, item };
      }
    }),
  );

  let degraded = false;
  let latestFetch = snapshot.checkedAt;
  const attentionItems: SylcItem[] = [];
  const roster: WatchlistRosterItem[] = [];
  const scoredForSummary: Array<{ needsAttention: boolean; severity: "low" | "medium" | "high" }> = [];

  for (const row of scoredRows) {
    if (row.kind === "missing") {
      roster.push({
        symbolId: row.item.symbolId,
        ticker: row.item.symbol.ticker,
        name: row.item.symbol.name,
        price: null,
        priceChangePct: null,
        score: null,
        severity: null,
        needsAttention: false,
      });
      continue;
    }

    if (row.kind === "fail") {
      degraded = true;
      continue;
    }

    degraded = degraded || row.signals.degraded;
    if (row.signals.fetchedAt > latestFetch) latestFetch = row.signals.fetchedAt;
    scoredForSummary.push(row.scored);

    roster.push({
      symbolId: row.item.symbolId,
      ticker: row.item.symbol.ticker,
      name: row.item.symbol.name,
      price: row.signals.current.price,
      priceChangePct: row.scored.signals.priceChangePct,
      score: row.scored.score,
      severity: row.scored.severity,
      needsAttention: row.scored.needsAttention,
    });

    if (!row.scored.needsAttention) continue;

    attentionItems.push({
      symbolId: row.item.symbolId,
      ticker: row.item.symbol.ticker,
      name: row.item.symbol.name,
      topNews: row.signals.current.newsSinceSnapshot.slice(0, 3).map((news) => ({
        title: news.title,
        url: news.url,
        publishedAt: news.publishedAt,
      })),
      ...row.scored,
    });
  }

  attentionItems.sort((a, b) => b.score - a.score);

  return {
    since: snapshot.checkedAt.toISOString(),
    snapshotId: snapshot.id,
    dataAsOf: latestFetch.toISOString(),
    degraded,
    isFirstVisit: false,
    summary: summarize(watchlist.length, scoredForSummary),
    items: attentionItems,
    roster,
  };
}

export async function getSylcDetail(userId: string, symbolId: string) {
  const watchlistItem = await prisma.watchlistItem.findFirst({
    where: { userId, symbolId },
    include: { symbol: true },
  });
  if (!watchlistItem) return null;

  const snapshot = await getLatestSnapshot(userId);
  const snapshotRow = snapshot?.symbols.find((row) => row.symbolId === symbolId);
  const since = snapshot?.checkedAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

  const signals = await getSymbolSignals(
    symbolId,
    watchlistItem.symbol.ticker,
    watchlistItem.symbol.name,
    since,
  );

  if (!snapshot || !snapshotRow) {
    return {
      since: null,
      dataAsOf: signals.fetchedAt.toISOString(),
      degraded: signals.degraded,
      hasSnapshot: false,
      symbol: watchlistItem.symbol,
      snapshot: null,
      current: signals.current,
      scored: null,
      history: [] as Awaited<ReturnType<typeof getSymbolChangeHistory>>,
    };
  }

  const scored = scoreSymbolChange({
    ticker: watchlistItem.symbol.ticker,
    snapshotCheckedAt: snapshot.checkedAt,
    snapshot: rowToSnapshot(snapshotRow),
    current: signals.current,
  });

  const history = await getSymbolChangeHistory(
    userId,
    symbolId,
    watchlistItem.symbol.ticker,
    scored,
    snapshot.checkedAt,
  );

  return {
    since: snapshot.checkedAt.toISOString(),
    dataAsOf: signals.fetchedAt.toISOString(),
    degraded: signals.degraded,
    hasSnapshot: true,
    symbol: watchlistItem.symbol,
    snapshot: rowToSnapshot(snapshotRow),
    current: signals.current,
    scored,
    history,
  };
}

export async function getSymbolChangeHistory(
  userId: string,
  symbolId: string,
  ticker: string,
  latestScored?: ReturnType<typeof scoreSymbolChange>,
  latestSince?: Date,
): Promise<ChangeHistoryEntry[]> {
  const snapshots = await prisma.userSnapshot.findMany({
    where: { userId },
    orderBy: { checkedAt: "desc" },
    take: 8,
    include: {
      symbols: {
        where: { symbolId },
      },
    },
  });

  const entries: ChangeHistoryEntry[] = [];

  if (latestScored && latestSince) {
    entries.push({
      at: new Date().toISOString(),
      since: latestSince.toISOString(),
      score: latestScored.score,
      severity: latestScored.severity,
      changeClass: latestScored.changeClass,
      priceChangePct: latestScored.signals.priceChangePct,
      headline: latestScored.headline,
    });
  }

  for (let i = 0; i < snapshots.length - 1; i++) {
    const newer = snapshots[i];
    const older = snapshots[i + 1];
    const newerRow = newer.symbols[0];
    const olderRow = older.symbols[0];
    if (!newerRow || !olderRow) continue;

    const scored = scoreSymbolChange({
      ticker,
      snapshotCheckedAt: older.checkedAt,
      comparedAt: newer.checkedAt,
      snapshot: rowToSnapshot(olderRow),
      current: snapshotAsCurrent(rowToSnapshot(newerRow)),
    });

    entries.push({
      at: newer.checkedAt.toISOString(),
      since: older.checkedAt.toISOString(),
      score: scored.score,
      severity: scored.severity,
      changeClass: scored.changeClass,
      priceChangePct: scored.signals.priceChangePct,
      headline: scored.headline,
    });
  }

  return entries;
}
