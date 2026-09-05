/**
 * Development-only fallback provider.
 * Enabled only when FINNHUB_API_KEY is missing AND USE_DEV_MARKET_DATA_FALLBACK=true.
 * Generates deterministic synthetic data — never used in production.
 */
import {
  BarData,
  MarketDataProvider,
  NewsData,
  QuoteData,
  SymbolSearchResult,
} from "@/lib/market-data/types";

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const KNOWN_SYMBOLS: SymbolSearchResult[] = [
  { ticker: "AAPL", name: "Apple Inc", exchange: "US" },
  { ticker: "MSFT", name: "Microsoft Corp", exchange: "US" },
  { ticker: "NVDA", name: "NVIDIA Corp", exchange: "US" },
  { ticker: "TSLA", name: "Tesla Inc", exchange: "US" },
  { ticker: "AMZN", name: "Amazon.com Inc", exchange: "US" },
];

export class DevFallbackProvider implements MarketDataProvider {
  async searchSymbols(query: string): Promise<SymbolSearchResult[]> {
    const q = query.toUpperCase();
    return KNOWN_SYMBOLS.filter(
      (item) => item.ticker.includes(q) || item.name.toUpperCase().includes(q),
    );
  }

  async getQuote(ticker: string): Promise<QuoteData> {
    const seed = hashString(ticker);
    return {
      price: 100 + (seed % 400),
      volume: 1_000_000 + (seed % 5_000_000),
      fetchedAt: new Date(),
    };
  }

  async getDailyBars(ticker: string, days = 60): Promise<BarData[]> {
    const seed = hashString(ticker);
    const bars: BarData[] = [];
    let price = 100 + (seed % 200);

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - i);
      const drift = ((seed + i) % 7) - 3;
      const open = price;
      price = Math.max(10, price + drift);
      const high = Math.max(open, price) * 1.01;
      const low = Math.min(open, price) * 0.99;
      bars.push({
        barDate: date,
        open,
        high,
        low,
        close: price,
        volume: 1_000_000 + ((seed + i) % 3_000_000),
      });
    }

    return bars;
  }

  async getCompanyNews(ticker: string, from: Date, to: Date): Promise<NewsData[]> {
    const midpoint = from.getTime() + (to.getTime() - from.getTime()) / 2;
    return [
      {
        externalId: `${ticker}-dev-1`,
        publishedAt: new Date(midpoint),
        title: `${ticker} reports quarterly earnings beat expectations`,
        source: "DevWire",
        url: "https://example.com/dev-news",
      },
    ];
  }
}
