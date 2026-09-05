export const MAX_WATCHLIST_SIZE = 15;

export const SIGNAL_WEIGHTS = {
  price: 0.3,
  volume: 0.25,
  news: 0.25,
  sentiment: 0.15,
  volatility: 0.05,
} as const;

export type SignalName = keyof typeof SIGNAL_WEIGHTS;

export type SignalStatus = "ok" | "stale" | "missing";

export type SignalResult = {
  value: number;
  normalized: number;
  status: SignalStatus;
  fetchedAt?: string;
};

export type SignalSnapshot = {
  price: number;
  volume: number;
  avgVolume20d: number;
  sentimentScore: number;
  newsCount: number;
  volatilityAtr: number;
};

export type SignalCurrent = SignalSnapshot & {
  newsSinceSnapshot: Array<{
    title: string;
    url: string;
    publishedAt: string;
    sentiment: number;
  }>;
};

export type ChangeClass = "normal" | "interesting" | "high_impact";

export type SignalContribution = {
  signal: SignalName;
  weight: number;
  normalized: number;
  points: number;
  contributionPct: number;
};

export type ScoredChange = {
  score: number;
  severity: "low" | "medium" | "high";
  changeClass: ChangeClass;
  activeSignals: SignalName[];
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
  passesFilter: boolean;
  needsAttention: boolean;
};

export type AttentionSummary = {
  watchlistSize: number;
  needingAttention: number;
  high: number;
  medium: number;
  quiet: number;
};

export type ChangeHistoryEntry = {
  at: string;
  since: string;
  score: number;
  severity: "low" | "medium" | "high";
  changeClass: ChangeClass;
  priceChangePct: number;
  headline: string;
};

export type SylcItem = ScoredChange & {
  symbolId: string;
  ticker: string;
  name: string;
  topNews: Array<{
    title: string;
    url: string;
    publishedAt: string;
  }>;
};

export type WatchlistRosterItem = {
  symbolId: string;
  ticker: string;
  name: string;
  price: number | null;
  priceChangePct: number | null;
  score: number | null;
  severity: "low" | "medium" | "high" | null;
  needsAttention: boolean;
};

export type SylcResponse = {
  since: string | null;
  snapshotId: string | null;
  dataAsOf: string;
  degraded: boolean;
  isFirstVisit: boolean;
  summary: AttentionSummary;
  items: SylcItem[];
  roster: WatchlistRosterItem[];
};
