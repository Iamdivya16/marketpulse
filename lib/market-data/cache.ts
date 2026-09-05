export const MARKET_HOURS_TTL_MS = 15 * 60 * 1000;
export const MARKET_CLOSED_TTL_MS = 4 * 60 * 60 * 1000;
export const NEWS_TTL_MS = 30 * 60 * 1000;

export function isCacheFresh(fetchedAt: Date, ttlMs: number): boolean {
  return Date.now() - fetchedAt.getTime() < ttlMs;
}

export function getUsMarketSession(now = new Date()): "Open" | "Closed" {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = hour >= 13 && hour < 20;
  return isWeekday && isMarketHours ? "Open" : "Closed";
}

export function marketDataTtl(now = new Date()): number {
  return getUsMarketSession(now) === "Open" ? MARKET_HOURS_TTL_MS : MARKET_CLOSED_TTL_MS;
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}
