const POSITIVE_KEYWORDS = [
  "beat",
  "surge",
  "upgrade",
  "record",
  "approval",
  "growth",
  "profit",
  "strong",
  "rally",
  "outperform",
];

const NEGATIVE_KEYWORDS = [
  "miss",
  "decline",
  "downgrade",
  "lawsuit",
  "probe",
  "cut",
  "loss",
  "weak",
  "fall",
  "recall",
  "investigation",
];

export const EVENT_KEYWORDS = [
  "earnings",
  "merger",
  "acquisition",
  "fda",
  "guidance",
  "lawsuit",
  "downgrade",
  "upgrade",
  "split",
  "dividend",
];

export function scoreHeadlineSentiment(title: string): number {
  const lower = title.toLowerCase();
  let score = 0;

  for (const word of POSITIVE_KEYWORDS) {
    if (lower.includes(word)) score += 0.1;
  }
  for (const word of NEGATIVE_KEYWORDS) {
    if (lower.includes(word)) score -= 0.1;
  }

  return Math.max(-1, Math.min(1, score));
}

export function averageSentiment(titles: string[]): number {
  if (titles.length === 0) return 0;
  const total = titles.reduce((sum, title) => sum + scoreHeadlineSentiment(title), 0);
  return total / titles.length;
}

export function countNotableNews(titles: string[]): number {
  if (titles.length === 0) return 0;

  let score = titles.length;
  for (const title of titles) {
    const lower = title.toLowerCase();
    if (EVENT_KEYWORDS.some((keyword) => lower.includes(keyword))) {
      score += 0.5;
    }
  }
  return score;
}

export function normalizePriceChange(pct: number): number {
  return Math.min(Math.abs(pct) / 10, 1);
}

export function normalizeVolumeRatio(ratio: number): number {
  return Math.min(Math.max(ratio - 1, 0) / 2, 1);
}

export function normalizeNewsCount(count: number): number {
  return Math.min(count / 5, 1);
}

export function normalizeSentimentDelta(delta: number): number {
  return Math.min(Math.abs(delta) / 0.5, 1);
}

export function normalizeVolatilityChange(pct: number): number {
  return Math.min(Math.abs(pct) / 30, 1);
}

export function computeAtr(
  bars: Array<{ high: number; low: number; close: number }>,
  period = 14,
): number {
  if (bars.length < period + 1) {
    return bars.length > 0 ? bars[bars.length - 1].close * 0.02 : 0;
  }

  const trueRanges: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const current = bars[i];
    const previous = bars[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close),
    );
    trueRanges.push(tr);
  }

  const recent = trueRanges.slice(-period);
  return recent.reduce((sum, value) => sum + value, 0) / recent.length;
}

export function averageVolume(bars: Array<{ volume: number }>, period = 20): number {
  if (bars.length === 0) return 0;
  const recent = bars.slice(-period);
  return recent.reduce((sum, bar) => sum + bar.volume, 0) / recent.length;
}

export function severityFromScore(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function passesNoiseFilter(
  score: number,
  normalizedBySignal: Record<string, number>,
  snapshotAgeHours: number,
): boolean {
  if (snapshotAgeHours < 1) return false;
  if (score >= 25) return true;
  return Object.values(normalizedBySignal).some((value) => value >= 0.7);
}
