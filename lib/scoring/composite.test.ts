import { describe, expect, it } from "vitest";
import { classifyChange } from "@/lib/scoring/context";
import { scoreSymbolChange } from "@/lib/scoring/composite";
import {
  averageSentiment,
  normalizePriceChange,
  normalizeVolumeRatio,
  passesNoiseFilter,
  scoreHeadlineSentiment,
} from "@/lib/scoring/signals";

describe("headline sentiment", () => {
  it("scores positive headlines higher than negative ones", () => {
    expect(scoreHeadlineSentiment("Company beats earnings with record growth")).toBeGreaterThan(0);
    expect(scoreHeadlineSentiment("Company misses earnings amid probe and downgrade")).toBeLessThan(0);
  });

  it("averages sentiment across headlines", () => {
    const score = averageSentiment([
      "Stock surge on strong growth",
      "Company faces lawsuit and decline",
    ]);
    expect(score).toBeGreaterThan(-1);
    expect(score).toBeLessThan(1);
  });
});

describe("signal normalization", () => {
  it("caps price movement normalization at 10%", () => {
    expect(normalizePriceChange(5)).toBe(0.5);
    expect(normalizePriceChange(20)).toBe(1);
  });

  it("normalizes volume ratio above baseline", () => {
    expect(normalizeVolumeRatio(1)).toBe(0);
    expect(normalizeVolumeRatio(3)).toBe(1);
  });
});

describe("noise filter", () => {
  it("blocks very recent snapshots", () => {
    expect(passesNoiseFilter(80, { price: 0.9 }, 0.5)).toBe(false);
  });

  it("allows strong single-signal moves", () => {
    expect(passesNoiseFilter(10, { price: 0.8 }, 2)).toBe(true);
  });
});

describe("contextual combinations", () => {
  it("treats a modest isolated price move as normal", () => {
    const result = classifyChange({
      priceChangePct: 1.2,
      volumeRatio: 1.05,
      newsCount: 0,
      sentimentDelta: 0,
      volatilityChangePct: 2,
      hasEventNews: false,
    });
    expect(result.changeClass).toBe("normal");
    expect(result.combinationBonus).toBe(0);
  });

  it("treats a large move with volume as interesting", () => {
    const result = classifyChange({
      priceChangePct: 4.8,
      volumeRatio: 2.7,
      newsCount: 0,
      sentimentDelta: 0,
      volatilityChangePct: 4,
      hasEventNews: false,
    });
    expect(result.changeClass).toBe("interesting");
    expect(result.activeSignals).toEqual(expect.arrayContaining(["price", "volume"]));
  });

  it("treats price + volume + earnings news as high-impact", () => {
    const result = classifyChange({
      priceChangePct: 3,
      volumeRatio: 2.4,
      newsCount: 3,
      sentimentDelta: -0.2,
      volatilityChangePct: 8,
      hasEventNews: true,
    });
    expect(result.changeClass).toBe("high_impact");
    expect(result.combinationBonus).toBe(15);
  });
});

describe("scoreSymbolChange", () => {
  const baseSnapshot = {
    price: 100,
    volume: 1_000_000,
    avgVolume20d: 1_000_000,
    sentimentScore: 0.1,
    newsCount: 0,
    volatilityAtr: 2,
  };

  const twoHoursAgo = () => new Date(Date.now() - 2 * 60 * 60 * 1000);

  it("keeps isolated noise below the attention bar", () => {
    const quiet = scoreSymbolChange({
      ticker: "AAPL",
      snapshotCheckedAt: twoHoursAgo(),
      snapshot: baseSnapshot,
      current: {
        ...baseSnapshot,
        price: 101.2,
        newsSinceSnapshot: [],
      },
    });

    expect(quiet.changeClass).toBe("normal");
    expect(quiet.needsAttention).toBe(false);
    expect(quiet.whyItMatters.toLowerCase()).toContain("normal");
  });

  it("scores combination moves higher than isolated ones", () => {
    const quiet = scoreSymbolChange({
      ticker: "AAPL",
      snapshotCheckedAt: twoHoursAgo(),
      snapshot: baseSnapshot,
      current: {
        ...baseSnapshot,
        price: 101,
        newsSinceSnapshot: [],
      },
    });

    const active = scoreSymbolChange({
      ticker: "NVDA",
      snapshotCheckedAt: twoHoursAgo(),
      snapshot: baseSnapshot,
      current: {
        ...baseSnapshot,
        price: 108,
        volume: 3_000_000,
        sentimentScore: -0.2,
        newsSinceSnapshot: [
          {
            title: "NVDA beats earnings expectations",
            url: "https://example.com",
            publishedAt: new Date().toISOString(),
            sentiment: 0.3,
          },
          {
            title: "Analyst upgrade after strong guidance",
            url: "https://example.com/2",
            publishedAt: new Date().toISOString(),
            sentiment: 0.2,
          },
        ],
      },
    });

    expect(active.score).toBeGreaterThan(quiet.score);
    expect(active.changeClass).toBe("high_impact");
    expect(active.needsAttention).toBe(true);
    expect(active.whyItMatters).toContain("combination");
    expect(active.combinationBonus).toBeGreaterThan(0);
  });

  it("keeps contributions transparent and deterministic", () => {
    const input = {
      ticker: "TSLA",
      snapshotCheckedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      snapshot: baseSnapshot,
      current: {
        ...baseSnapshot,
        price: 112,
        volume: 2_500_000,
        newsSinceSnapshot: [] as [],
      },
    };

    const first = scoreSymbolChange(input);
    const second = scoreSymbolChange(input);

    expect(first.score).toBe(second.score);
    expect(first.contributions).toEqual(second.contributions);
    expect(first.changeClass).toBe(second.changeClass);
  });
});
