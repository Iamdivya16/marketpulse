import { prisma } from "@/lib/db";
import {
  isCacheFresh,
  marketDataTtl,
  NEWS_TTL_MS,
  toNumber,
} from "@/lib/market-data/cache";
import { createMarketDataProvider } from "@/lib/market-data/finnhub";
import { getYahooDailyBars } from "@/lib/market-data/yahoo-bars";
import { averageSentiment, averageVolume, computeAtr, scoreHeadlineSentiment } from "@/lib/scoring/signals";
import { SignalCurrent, SignalSnapshot } from "@/lib/scoring/types";
import { BarData, NewsData } from "@/lib/market-data/types";

export type SymbolSignals = {
  symbolId: string;
  ticker: string;
  name: string;
  current: SignalCurrent;
  fetchedAt: Date;
  degraded: boolean;
};

function looksLikeSyntheticBars(bars: Array<{ close: number }>): boolean {
  if (bars.length <= 1) return true;
  if (bars.length < 10) return false;

  let integerSteps = 0;
  for (let i = 1; i < bars.length; i++) {
    const delta = bars[i].close - bars[i - 1].close;
    if (Number.isInteger(delta) && Math.abs(delta) <= 3) integerSteps += 1;
  }
  return integerSteps / (bars.length - 1) > 0.65;
}

async function upsertSymbol(ticker: string, name?: string) {
  return prisma.symbol.upsert({
    where: { ticker: ticker.toUpperCase() },
    update: name ? { name } : {},
    create: {
      ticker: ticker.toUpperCase(),
      name: name ?? ticker.toUpperCase(),
      exchange: "US",
    },
  });
}

async function getCachedBars(symbolId: string): Promise<
  Array<{
    barDate: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    fetchedAt: Date;
  }>
> {
  const bars = await prisma.marketBar.findMany({
    where: { symbolId },
    orderBy: { barDate: "asc" },
  });

  return bars.map((bar) => ({
    barDate: bar.barDate,
    open: toNumber(bar.open),
    high: toNumber(bar.high),
    low: toNumber(bar.low),
    close: toNumber(bar.close),
    volume: toNumber(bar.volume),
    fetchedAt: bar.fetchedAt,
  }));
}

async function cacheBars(symbolId: string, bars: BarData[]): Promise<void> {
  if (bars.length === 0) return;

  const rows = bars.map((bar) => {
    const barDate = new Date(
      Date.UTC(bar.barDate.getUTCFullYear(), bar.barDate.getUTCMonth(), bar.barDate.getUTCDate()),
    );
    return {
      symbolId,
      barDate,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: BigInt(Math.round(bar.volume)),
      fetchedAt: new Date(),
    };
  });

  await prisma.$transaction([
    prisma.marketBar.deleteMany({ where: { symbolId } }),
    prisma.marketBar.createMany({ data: rows }),
  ]);
}

async function getCachedNews(symbolId: string, since: Date) {
  return prisma.newsItem.findMany({
    where: {
      symbolId,
      publishedAt: { gte: since },
    },
    orderBy: { publishedAt: "desc" },
    take: 20,
  });
}

async function cacheNews(symbolId: string, news: NewsData[]): Promise<void> {
  for (const item of news) {
    const sentiment = scoreHeadlineSentiment(item.title);
    await prisma.newsItem.upsert({
      where: { externalId: item.externalId },
      update: {
        title: item.title,
        source: item.source,
        url: item.url,
        publishedAt: item.publishedAt,
        sentiment,
        fetchedAt: new Date(),
      },
      create: {
        symbolId,
        externalId: item.externalId,
        title: item.title,
        source: item.source,
        url: item.url,
        publishedAt: item.publishedAt,
        sentiment,
      },
    });
  }
}

export async function ensureSymbolRecord(ticker: string, name?: string) {
  return upsertSymbol(ticker, name);
}

export async function searchSymbols(query: string) {
  const provider = createMarketDataProvider();
  return provider.searchSymbols(query);
}

export async function getSymbolSignals(
  symbolId: string,
  ticker: string,
  name: string,
  since: Date,
): Promise<SymbolSignals> {
  const provider = createMarketDataProvider();
  let degraded = false;
  let fetchedAt = new Date();

  let bars = await getCachedBars(symbolId);
  const latestBarFetch = bars[bars.length - 1]?.fetchedAt;
  const barsStale =
    !latestBarFetch || !isCacheFresh(latestBarFetch, marketDataTtl());

  if (barsStale || bars.length < 21 || looksLikeSyntheticBars(bars)) {
    try {
      const freshBars = await provider.getDailyBars(ticker, 60);
      if (freshBars.length > 1) {
        await cacheBars(symbolId, freshBars);
        bars = await getCachedBars(symbolId);
        fetchedAt = new Date();
      }
    } catch {
      degraded = true;
    }
  }

  let quotePrice = bars[bars.length - 1]?.close ?? 0;
  let quoteVolume = bars[bars.length - 1]?.volume ?? 0;

  let newsRows = await getCachedNews(symbolId, since);
  const latestNewsFetch = newsRows[0]?.fetchedAt;
  const newsStale =
    newsRows.length === 0 || !latestNewsFetch || !isCacheFresh(latestNewsFetch, NEWS_TTL_MS);

  const [quoteResult, newsResult] = await Promise.allSettled([
    provider.getQuote(ticker),
    newsStale
      ? provider.getCompanyNews(ticker, since, new Date()).then(async (freshNews) => {
          await cacheNews(symbolId, freshNews);
          return getCachedNews(symbolId, since);
        })
      : Promise.resolve(newsRows),
  ]);

  if (quoteResult.status === "fulfilled") {
    const quote = quoteResult.value;
    quotePrice = quote.price;
    quoteVolume = quote.volume || quoteVolume;
    fetchedAt = quote.fetchedAt;
    if (bars.length === 0) {
      bars = [
        {
          barDate: new Date(),
          open: quote.price,
          high: quote.price,
          low: quote.price,
          close: quote.price,
          volume: quote.volume || 0,
          fetchedAt: quote.fetchedAt,
        },
      ];
    }
  } else {
    degraded = true;
  }

  if (newsResult.status === "fulfilled") {
    newsRows = newsResult.value;
  } else {
    degraded = true;
  }

  if (quotePrice <= 0) {
    throw new Error(`No market data available for ${ticker}`);
  }

  const newsSinceSnapshot = newsRows.map((item) => ({
    title: item.title,
    url: item.url,
    publishedAt: item.publishedAt.toISOString(),
    sentiment: toNumber(item.sentiment),
  }));

  const avgVolume20d = averageVolume(bars, 20) || Math.max(quoteVolume, 1);
  const atr = computeAtr(bars) || quotePrice * 0.02;
  const sentimentScore = averageSentiment(newsRows.map((item) => item.title));

  const current: SignalCurrent = {
    price: quotePrice,
    volume: quoteVolume,
    avgVolume20d,
    sentimentScore,
    newsCount: newsSinceSnapshot.length,
    volatilityAtr: atr,
    newsSinceSnapshot,
  };

  return {
    symbolId,
    ticker,
    name,
    current,
    fetchedAt,
    degraded,
  };
}

export async function getBarsForChart(symbolId: string, ticker: string, days = 30) {
  try {
    const freshBars = await getYahooDailyBars(ticker, Math.max(days, 60));
    if (freshBars.length > 1) {
      await cacheBars(symbolId, freshBars);
      return freshBars.slice(-days);
    }
  } catch {
    // Fall through to cache.
  }

  const bars = await getCachedBars(symbolId);
  if (bars.length > 1 && !looksLikeSyntheticBars(bars)) {
    return bars.slice(-days);
  }

  const provider = createMarketDataProvider();
  const quote = await provider.getQuote(ticker);
  return [
    {
      barDate: new Date(),
      open: quote.price,
      high: quote.price,
      low: quote.price,
      close: quote.price,
      volume: quote.volume || 0,
      fetchedAt: quote.fetchedAt,
    },
  ];
}

export function snapshotFromSignals(current: SignalCurrent): SignalSnapshot {
  return {
    price: current.price,
    volume: current.volume,
    avgVolume20d: current.avgVolume20d,
    sentimentScore: current.sentimentScore,
    newsCount: current.newsCount,
    volatilityAtr: current.volatilityAtr,
  };
}
