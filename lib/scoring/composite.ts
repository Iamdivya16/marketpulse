import {
  countNotableNews,
  normalizeNewsCount,
  normalizePriceChange,
  normalizeSentimentDelta,
  normalizeVolatilityChange,
  normalizeVolumeRatio,
  passesNoiseFilter,
} from "@/lib/scoring/signals";
import {
  SIGNAL_WEIGHTS,
  ScoredChange,
  SignalContribution,
  SignalCurrent,
  SignalName,
  SignalSnapshot,
} from "@/lib/scoring/types";
import { buildExplanation, buildHeadline, buildWhyItMatters } from "@/lib/scoring/explain";
import {
  classifyChange,
  headlinesHaveEvent,
  needsAttention,
  severityFromClass,
} from "@/lib/scoring/context";

type ScoreInput = {
  ticker: string;
  snapshot: SignalSnapshot;
  current: SignalCurrent;
  snapshotCheckedAt: Date;
  comparedAt?: Date;
};

function buildContributions(
  normalized: Partial<Record<SignalName, number>>,
): { weightedScore: number; contributions: SignalContribution[] } {
  const available = (Object.keys(SIGNAL_WEIGHTS) as SignalName[]).filter(
    (signal) => normalized[signal] !== undefined,
  );

  if (available.length === 0) {
    return { weightedScore: 0, contributions: [] };
  }

  const weightedSum = available.reduce((sum, signal) => {
    return sum + SIGNAL_WEIGHTS[signal] * (normalized[signal] ?? 0);
  }, 0);

  const totalWeight = available.reduce((sum, signal) => sum + SIGNAL_WEIGHTS[signal], 0);
  const weightedScore = (100 * weightedSum) / totalWeight;

  const rawContributions = available.map((signal) => ({
    signal,
    weight: SIGNAL_WEIGHTS[signal],
    normalized: normalized[signal] ?? 0,
    raw: SIGNAL_WEIGHTS[signal] * (normalized[signal] ?? 0),
    points: Math.round(SIGNAL_WEIGHTS[signal] * (normalized[signal] ?? 0) * 100),
  }));

  const rawTotal = rawContributions.reduce((sum, item) => sum + item.raw, 0) || 1;

  const contributions = rawContributions
    .map(({ signal, weight, normalized: norm, points }) => ({
      signal,
      weight,
      normalized: norm,
      points,
      contributionPct: Math.round((100 * (weight * norm)) / rawTotal),
    }))
    .sort((a, b) => b.points - a.points || b.contributionPct - a.contributionPct);

  return { weightedScore, contributions };
}

export function scoreSymbolChange(input: ScoreInput): ScoredChange {
  const { snapshot, current, snapshotCheckedAt, ticker, comparedAt } = input;

  const priceChangePct =
    snapshot.price > 0 ? ((current.price - snapshot.price) / snapshot.price) * 100 : 0;
  const volumeRatio =
    snapshot.avgVolume20d > 0 ? current.volume / snapshot.avgVolume20d : 1;
  const newsTitles = current.newsSinceSnapshot.map((item) => item.title);
  const newsCount =
    current.newsSinceSnapshot.length > 0
      ? current.newsSinceSnapshot.length
      : Math.max(0, current.newsCount - snapshot.newsCount);
  const notableNewsScore =
    newsTitles.length > 0 ? countNotableNews(newsTitles) : newsCount;
  const hasEventNews = headlinesHaveEvent(newsTitles);
  const sentimentDelta = current.sentimentScore - snapshot.sentimentScore;
  const volatilityChangePct =
    snapshot.volatilityAtr > 0
      ? ((current.volatilityAtr - snapshot.volatilityAtr) / snapshot.volatilityAtr) * 100
      : 0;

  const normalized: Partial<Record<SignalName, number>> = {
    price: normalizePriceChange(priceChangePct),
    volume: normalizeVolumeRatio(volumeRatio),
    news: normalizeNewsCount(notableNewsScore),
    sentiment: normalizeSentimentDelta(sentimentDelta),
    volatility: normalizeVolatilityChange(volatilityChangePct),
  };

  const { weightedScore, contributions } = buildContributions(normalized);
  const context = classifyChange({
    priceChangePct,
    volumeRatio,
    newsCount,
    sentimentDelta,
    volatilityChangePct,
    hasEventNews,
  });

  const score = Math.min(100, Math.round(weightedScore + context.combinationBonus));
  const compared = comparedAt ?? new Date();
  const snapshotAgeHours =
    (compared.getTime() - snapshotCheckedAt.getTime()) / (1000 * 60 * 60);

  const passesFilter = passesNoiseFilter(score, normalized, snapshotAgeHours);

  const signals = {
    priceChangePct: Number(priceChangePct.toFixed(2)),
    volumeRatio: Number(volumeRatio.toFixed(2)),
    newsCount,
    sentimentDelta: Number(sentimentDelta.toFixed(3)),
    volatilityChangePct: Number(volatilityChangePct.toFixed(2)),
  };

  const topNewsTitle = current.newsSinceSnapshot[0]?.title;
  const explainInput = {
    ticker,
    changeClass: context.changeClass,
    activeSignals: context.activeSignals,
    combinationBonus: context.combinationBonus,
    hasEventNews,
    signals,
    contributions,
    topNewsTitle,
  };

  return {
    score,
    severity: severityFromClass(context.changeClass, score),
    changeClass: context.changeClass,
    activeSignals: context.activeSignals,
    combinationBonus: context.combinationBonus,
    headline: buildHeadline(explainInput),
    explanation: buildExplanation(explainInput),
    whyItMatters: buildWhyItMatters(explainInput),
    contributions,
    signals,
    passesFilter,
    needsAttention: needsAttention(context.changeClass, passesFilter),
  };
}
