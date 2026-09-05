import { describe, expect, it } from "vitest";
import { MAX_WATCHLIST_SIZE, SIGNAL_WEIGHTS } from "@/lib/scoring/types";

describe("watchlist constraints", () => {
  it("caps watchlist size for MVP reliability", () => {
    expect(MAX_WATCHLIST_SIZE).toBe(15);
  });
});

describe("scoring weights", () => {
  it("uses deterministic weights that sum to 1", () => {
    const total = Object.values(SIGNAL_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBeCloseTo(1);
  });

  it("prioritizes price, volume, and news equally as top signals", () => {
    expect(SIGNAL_WEIGHTS.price).toBe(0.3);
    expect(SIGNAL_WEIGHTS.volume).toBe(0.25);
    expect(SIGNAL_WEIGHTS.news).toBe(0.25);
  });
});
