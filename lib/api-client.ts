export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiClientError(data.error ?? "Request failed", response.status);
  }
  return data as T;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ id: string; email: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ id: string; email: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ success: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ id: string; email: string }>("/api/auth/me"),
  getWatchlist: () =>
    request<{
      items: Array<{
        id: string;
        symbolId: string;
        ticker: string;
        name: string;
        addedAt: string;
      }>;
      maxSize: number;
    }>("/api/watchlist"),
  addToWatchlist: (ticker: string, name?: string) =>
    request("/api/watchlist", {
      method: "POST",
      body: JSON.stringify({ ticker, name }),
    }),
  removeFromWatchlist: (symbolId: string) =>
    request(`/api/watchlist/${symbolId}`, { method: "DELETE" }),
  searchSymbols: (q: string) =>
    request<{ results: Array<{ ticker: string; name: string; exchange: string }> }>(
      `/api/symbols/search?q=${encodeURIComponent(q)}`,
    ),
  getSylc: () => request<import("@/lib/scoring/types").SylcResponse>("/api/sylc"),
  getLatestSnapshot: () =>
    request<{ checkedAt: string | null; snapshotId: string | null }>("/api/snapshots/latest"),
  acknowledgeSylc: () =>
    request<{ snapshotId: string; checkedAt: string; dataAsOf: string; degraded: boolean }>(
      "/api/sylc/acknowledge",
      { method: "POST" },
    ),
  getSylcDetail: (symbolId: string) => request(`/api/sylc/${symbolId}`),
  getBars: (ticker: string, range = "1mo") =>
    request<{ bars: Array<{ date: string; close: number; volume: number }> }>(
      `/api/symbols/${ticker}/bars?range=${range}`,
    ),
  getNews: (ticker: string) =>
    request<{
      items: Array<{
        title: string;
        url: string;
        source: string;
        publishedAt: string;
        sentiment: number;
      }>;
    }>(`/api/symbols/${ticker}/news`),
};
