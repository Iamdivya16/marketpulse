import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response";
import { getSymbolSignals } from "@/lib/market-data/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  try {
    await requireUserId();
    const { ticker } = await params;
    const symbol = await prisma.symbol.findUnique({
      where: { ticker: ticker.toUpperCase() },
    });

    if (!symbol) {
      return jsonError("Symbol not found", 404);
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const signals = await getSymbolSignals(symbol.id, symbol.ticker, symbol.name, since);

    return jsonOk({
      id: symbol.id,
      ticker: symbol.ticker,
      name: symbol.name,
      exchange: symbol.exchange,
      quote: {
        price: signals.current.price,
        volume: signals.current.volume,
      },
      fetchedAt: signals.fetchedAt.toISOString(),
      degraded: signals.degraded,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
