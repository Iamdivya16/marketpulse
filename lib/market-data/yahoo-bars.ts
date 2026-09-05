import { BarData, MarketDataError } from "@/lib/market-data/types";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: { description?: string };
  };
};

function rangeForDays(days: number): string {
  if (days <= 7) return "1mo";
  if (days <= 60) return "3mo";
  return "6mo";
}

export async function getYahooDailyBars(ticker: string, days = 60): Promise<BarData[]> {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`);
  url.searchParams.set("interval", "1d");
  url.searchParams.set("range", rangeForDays(days));

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MarketPulse/1.0)",
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new MarketDataError(`Yahoo chart request failed (${response.status})`);
  }

  const data = (await response.json()) as YahooChartResponse;
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];

  if (!timestamps.length || !quote?.close) {
    throw new MarketDataError(`No Yahoo chart data for ${ticker}`);
  }

  const bars: BarData[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = quote.close[i];
    if (close == null || close <= 0) continue;
    const open = quote.open?.[i] ?? close;
    const high = quote.high?.[i] ?? close;
    const low = quote.low?.[i] ?? close;
    const volume = quote.volume?.[i] ?? 0;
    bars.push({
      barDate: new Date(timestamps[i] * 1000),
      open,
      high,
      low,
      close,
      volume,
    });
  }

  if (bars.length === 0) {
    throw new MarketDataError(`No Yahoo chart data for ${ticker}`);
  }

  return bars.slice(-Math.max(days, 1));
}
