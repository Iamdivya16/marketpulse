import { ChangeClass, SignalName } from "@/lib/scoring/types";
import { EVENT_KEYWORDS } from "@/lib/scoring/signals";

export type ActiveSignals = {
  price: boolean;
  volume: boolean;
  news: boolean;
  sentiment: boolean;
  volatility: boolean;
};

export type ChangeContext = {
  changeClass: ChangeClass;
  activeSignals: SignalName[];
  hasEventNews: boolean;
  combinationBonus: number;
};

export function headlinesHaveEvent(titles: string[]): boolean {
  return titles.some((title) => {
    const lower = title.toLowerCase();
    return EVENT_KEYWORDS.some((keyword) => lower.includes(keyword));
  });
}

export function detectActiveSignals(input: {
  priceChangePct: number;
  volumeRatio: number;
  newsCount: number;
  sentimentDelta: number;
  volatilityChangePct: number;
  hasEventNews: boolean;
}): ActiveSignals {
  return {
    price: Math.abs(input.priceChangePct) >= 2.5,
    volume: input.volumeRatio >= 1.8,
    news: input.newsCount >= 2 || input.hasEventNews,
    sentiment: Math.abs(input.sentimentDelta) >= 0.15,
    volatility: Math.abs(input.volatilityChangePct) >= 15,
  };
}

export function classifyChange(input: {
  priceChangePct: number;
  volumeRatio: number;
  newsCount: number;
  sentimentDelta: number;
  volatilityChangePct: number;
  hasEventNews: boolean;
}): ChangeContext {
  const flags = detectActiveSignals(input);
  const activeSignals = (Object.keys(flags) as SignalName[]).filter(
    (signal) => flags[signal],
  );
  const comboCount = activeSignals.length;

  const priceAndVolume = flags.price && flags.volume;
  const highImpactCombo =
    comboCount >= 3 ||
    (flags.volume && flags.news) ||
    (priceAndVolume && (flags.news || flags.sentiment));

  const interestingCombo =
    comboCount >= 2 ||
    (Math.abs(input.priceChangePct) >= 4 && input.volumeRatio >= 1.8) ||
    input.volumeRatio >= 2.5;

  let changeClass: ChangeClass = "normal";
  if (highImpactCombo) {
    changeClass = "high_impact";
  } else if (interestingCombo) {
    changeClass = "interesting";
  }

  const combinationBonus =
    changeClass === "high_impact" ? 15 : changeClass === "interesting" ? 8 : 0;

  return {
    changeClass,
    activeSignals,
    hasEventNews: input.hasEventNews,
    combinationBonus,
  };
}

export function severityFromClass(
  changeClass: ChangeClass,
  score: number,
): "low" | "medium" | "high" {
  if (changeClass === "high_impact" || score >= 70) return "high";
  if (changeClass === "interesting" || score >= 40) return "medium";
  return "low";
}

export function needsAttention(changeClass: ChangeClass, passesFilter: boolean): boolean {
  return passesFilter && changeClass !== "normal";
}
