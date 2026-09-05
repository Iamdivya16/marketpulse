import { ChangeClass, SignalContribution, SignalName } from "@/lib/scoring/types";

type ExplainInput = {
  ticker: string;
  changeClass: ChangeClass;
  activeSignals: SignalName[];
  combinationBonus: number;
  hasEventNews: boolean;
  signals: {
    priceChangePct: number;
    volumeRatio: number;
    newsCount: number;
    sentimentDelta: number;
    volatilityChangePct: number;
  };
  contributions: SignalContribution[];
  topNewsTitle?: string;
};

function significantContributions(contributions: SignalContribution[]): SignalContribution[] {
  return contributions.filter((item) => item.contributionPct >= 15);
}

function signedPct(pct: number): string {
  const abs = Math.abs(pct).toFixed(1);
  return `${pct >= 0 ? "+" : "−"}${abs}%`;
}

export function buildHeadline(input: ExplainInput): string {
  const { signals } = input;
  const parts: string[] = [];

  if (Math.abs(signals.priceChangePct) >= 0.4) {
    parts.push(`${signedPct(signals.priceChangePct)} since last check`);
  }
  if (signals.volumeRatio >= 1.3) {
    parts.push(`${signals.volumeRatio.toFixed(1)}× normal volume`);
  }
  if (signals.newsCount > 0) {
    parts.push(
      `${signals.newsCount} new headline${signals.newsCount === 1 ? "" : "s"}`,
    );
  }

  if (parts.length === 0) {
    return "Quiet since your last check — isolated movement only";
  }

  return parts.join(" · ");
}

export function buildExplanation(input: ExplainInput): string {
  const sentences: string[] = [];
  const { ticker, signals, contributions, topNewsTitle } = input;

  for (const item of significantContributions(contributions)) {
    if (item.signal === "price" && Math.abs(signals.priceChangePct) >= 0.5) {
      const direction = signals.priceChangePct >= 0 ? "up" : "down";
      sentences.push(
        `${ticker} is ${direction} ${Math.abs(signals.priceChangePct).toFixed(1)}% since your last check.`,
      );
    }

    if (item.signal === "volume" && signals.volumeRatio >= 1.2) {
      sentences.push(
        `Trading volume is ${signals.volumeRatio.toFixed(1)}× the 20-day average.`,
      );
    }

    if (item.signal === "news" && signals.newsCount > 0) {
      if (topNewsTitle) {
        sentences.push(
          `${signals.newsCount} notable headline${signals.newsCount === 1 ? "" : "s"} since your last visit, including "${topNewsTitle}".`,
        );
      } else {
        sentences.push(
          `${signals.newsCount} notable headline${signals.newsCount === 1 ? "" : "s"} since your last visit.`,
        );
      }
    }

    if (item.signal === "sentiment" && Math.abs(signals.sentimentDelta) >= 0.05) {
      const direction = signals.sentimentDelta >= 0 ? "more positive" : "more negative";
      sentences.push(
        `Headline sentiment shifted ${direction} (${Math.abs(signals.sentimentDelta).toFixed(2)} pts).`,
      );
    }

    if (item.signal === "volatility" && Math.abs(signals.volatilityChangePct) >= 5) {
      sentences.push(
        `Price volatility changed ${Math.abs(signals.volatilityChangePct).toFixed(1)}% (ATR).`,
      );
    }

    if (sentences.length >= 3) break;
  }

  if (sentences.length === 0) {
    return `${ticker} shows modest, isolated changes across tracked signals since your last check.`;
  }

  return sentences.slice(0, 3).join(" ");
}

export function buildWhyItMatters(input: ExplainInput): string {
  const { changeClass, activeSignals, hasEventNews, signals } = input;
  const combo = activeSignals.length;

  if (changeClass === "high_impact") {
    const pieces: string[] = [];
    if (activeSignals.includes("volume")) {
      pieces.push("an abnormal volume spike");
    }
    if (activeSignals.includes("news") || hasEventNews) {
      pieces.push(
        hasEventNews
          ? "event-related news (such as earnings or guidance)"
          : "a cluster of new headlines",
      );
    }
    if (activeSignals.includes("sentiment")) {
      pieces.push(
        signals.sentimentDelta < 0
          ? "a negative sentiment shift"
          : "a notable sentiment shift",
      );
    }
    if (activeSignals.includes("price") && pieces.length < 2) {
      pieces.push("a larger-than-normal price move");
    }

    const joined =
      pieces.length === 0
        ? "several independent signals moving together"
        : pieces.length === 1
          ? pieces[0]
          : `${pieces.slice(0, -1).join(", ")} and ${pieces[pieces.length - 1]}`;

    return `The price move is accompanied by ${joined}, making this more significant than a normal daily fluctuation. The engine treats this as a combination, not an isolated movement.`;
  }

  if (changeClass === "interesting") {
    if (activeSignals.includes("price") && activeSignals.includes("volume")) {
      return `A ${Math.abs(signals.priceChangePct).toFixed(1)}% move with ${signals.volumeRatio.toFixed(1)}× volume is more convincing than price alone — participation suggests the move is being noticed.`;
    }
    if (combo >= 2) {
      return `Two signals lined up at once (${activeSignals.join(" + ")}). Isolated noise usually does not do that.`;
    }
    return `Volume or news is elevated enough to stand out from a routine session, even if the price print looks ordinary.`;
  }

  return `This looks like normal market noise — a modest move without unusual volume, news, or sentiment. You can safely skip it.`;
}
