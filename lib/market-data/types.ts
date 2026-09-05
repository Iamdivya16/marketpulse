export type QuoteData = {
  price: number;
  volume: number;
  fetchedAt: Date;
};

export type BarData = {
  barDate: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type NewsData = {
  externalId: string;
  publishedAt: Date;
  title: string;
  source: string;
  url: string;
};

export type SymbolSearchResult = {
  ticker: string;
  name: string;
  exchange: string;
};

export interface MarketDataProvider {
  searchSymbols(query: string): Promise<SymbolSearchResult[]>;
  getQuote(ticker: string): Promise<QuoteData>;
  getDailyBars(ticker: string, days?: number): Promise<BarData[]>;
  getCompanyNews(ticker: string, from: Date, to: Date): Promise<NewsData[]>;
}

export class MarketDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketDataError";
  }
}
