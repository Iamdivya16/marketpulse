import {
  BarData,
  MarketDataError,
  MarketDataProvider,
  NewsData,
  QuoteData,
  SymbolSearchResult,
} from "@/lib/market-data/types";
import { DevFallbackProvider } from "@/lib/market-data/dev-fallback";
import { getYahooDailyBars } from "@/lib/market-data/yahoo-bars";

const BASE_URL = "https://finnhub.io/api/v1";

function barsFromQuote(quote: QuoteData): BarData[] {
  const barDate = new Date();
  barDate.setUTCHours(0, 0, 0, 0);
  return [
    {
      barDate,
      open: quote.price,
      high: quote.price,
      low: quote.price,
      close: quote.price,
      volume: quote.volume,
    },
  ];
}

function getApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    throw new MarketDataError(
      "FINNHUB_API_KEY is not configured. Add it to your .env file.",
    );
  }
  return key;
}

async function finnhubFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("token", getApiKey());

  const response = await fetch(url.toString(), {
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new MarketDataError(`Finnhub request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export class FinnhubProvider implements MarketDataProvider {
  async searchSymbols(query: string): Promise<SymbolSearchResult[]> {
    const data = await finnhubFetch<{ result?: Array<{ symbol: string; description: string; type: string }> }>(
      "/search",
      { q: query },
    );

    return (data.result ?? [])
      .filter((item) => item.type === "Common Stock")
      .slice(0, 10)
      .map((item) => ({
        ticker: item.symbol,
        name: item.description,
        exchange: "US",
      }));
  }

  async getQuote(ticker: string): Promise<QuoteData> {
    const data = await finnhubFetch<{ c: number; v?: number; t?: number }>("/quote", {
      symbol: ticker,
    });

    if (!data.c || data.c <= 0) {
      throw new MarketDataError(`No quote available for ${ticker}`);
    }

    return {
      price: data.c,
      volume: data.v ?? 0,
      fetchedAt: new Date((data.t ?? Date.now() / 1000) * 1000),
    };
  }

  async getDailyBars(ticker: string, days = 60): Promise<BarData[]> {
    try {
      return await getYahooDailyBars(ticker, days);
    } catch {
      // Yahoo unavailable — last resort is a single quote point.
    }

    const quote = await this.getQuote(ticker);
    return barsFromQuote(quote);
  }

  async getCompanyNews(ticker: string, from: Date, to: Date): Promise<NewsData[]> {
    const data = await finnhubFetch<
      Array<{
        id: number;
        datetime: number;
        headline: string;
        source: string;
        url: string;
      }>
    >("/company-news", {
      symbol: ticker,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    });

    return data.map((item) => ({
      externalId: String(item.id),
      publishedAt: new Date(item.datetime * 1000),
      title: item.headline,
      source: item.source,
      url: item.url,
    }));
  }
}

class FallbackOnErrorProvider implements MarketDataProvider {
  constructor(
    private primary: MarketDataProvider,
    private fallback: MarketDataProvider,
  ) {}

  async searchSymbols(query: string) {
    try {
      return await this.primary.searchSymbols(query);
    } catch {
      return this.fallback.searchSymbols(query);
    }
  }

  async getQuote(ticker: string) {
    try {
      return await this.primary.getQuote(ticker);
    } catch {
      return this.fallback.getQuote(ticker);
    }
  }

  async getDailyBars(ticker: string, days?: number) {
    try {
      return await this.primary.getDailyBars(ticker, days);
    } catch {
      return this.fallback.getDailyBars(ticker, days);
    }
  }

  async getCompanyNews(ticker: string, from: Date, to: Date) {
    try {
      return await this.primary.getCompanyNews(ticker, from, to);
    } catch {
      return this.fallback.getCompanyNews(ticker, from, to);
    }
  }
}

export function createMarketDataProvider(): MarketDataProvider {
  const key = process.env.FINNHUB_API_KEY?.trim();
  const fallback = new DevFallbackProvider();

  if (key && key !== "your-finnhub-api-key") {
    const finnhub = new FinnhubProvider();
    if (process.env.NODE_ENV !== "production") {
      return new FallbackOnErrorProvider(finnhub, fallback);
    }
    return finnhub;
  }

  if (process.env.NODE_ENV !== "production") {
    return fallback;
  }

  throw new MarketDataError(
    "FINNHUB_API_KEY is not configured. Set a valid key for production.",
  );
}
