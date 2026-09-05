import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response";
import { getBarsForChart } from "@/lib/market-data/service";

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  try {
    await requireUserId();
    const { ticker } = await params;
    const url = new URL(request.url);
    const range = url.searchParams.get("range") ?? "1mo";
    const days = range === "3mo" ? 90 : range === "1mo" ? 30 : 7;

    const symbol = await prisma.symbol.findUnique({
      where: { ticker: ticker.toUpperCase() },
    });
    if (!symbol) {
      return jsonError("Symbol not found", 404);
    }

    const bars = await getBarsForChart(symbol.id, symbol.ticker, days);
    const byDay = new Map<string, (typeof bars)[number]>();
    for (const bar of bars) {
      byDay.set(utcDay(bar.barDate), bar);
    }

    return jsonOk({
      bars: [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, bar]) => ({
          date,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
        })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
