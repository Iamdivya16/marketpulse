import { describe, expect, it } from "vitest";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const addWatchlistSchema = z.object({
  ticker: z.string().min(1).max(10),
  name: z.string().optional(),
});

describe("auth validation", () => {
  it("rejects invalid email", () => {
    expect(() => registerSchema.parse({ email: "bad", password: "password123" })).toThrow();
  });

  it("rejects short passwords", () => {
    expect(() =>
      registerSchema.parse({ email: "user@example.com", password: "short" }),
    ).toThrow(/8 characters/);
  });

  it("accepts valid registration payloads", () => {
    const result = registerSchema.parse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.email).toBe("user@example.com");
  });
});

describe("watchlist validation", () => {
  it("normalizes ticker input shape", () => {
    const result = addWatchlistSchema.parse({ ticker: "aapl" });
    expect(result.ticker).toBe("aapl");
  });

  it("rejects empty tickers", () => {
    expect(() => addWatchlistSchema.parse({ ticker: "" })).toThrow();
  });
});
