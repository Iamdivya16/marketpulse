import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { MAX_WATCHLIST_SIZE } from "@/lib/scoring/types";
import { ensureSymbolRecord } from "@/lib/market-data/service";
import { z } from "zod";

export async function GET() {
  try {
    const userId = await requireUserId();
    const items = await prisma.watchlistItem.findMany({
      where: { userId },
      include: { symbol: true },
      orderBy: { addedAt: "asc" },
    });

    return jsonOk({
      items: items.map((item) => ({
        id: item.id,
        symbolId: item.symbolId,
        ticker: item.symbol.ticker,
        name: item.symbol.name,
        addedAt: item.addedAt.toISOString(),
      })),
      maxSize: MAX_WATCHLIST_SIZE,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const addSchema = z.object({
  ticker: z.string().min(1).max(10),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = addSchema.parse(await request.json());
    const ticker = body.ticker.toUpperCase();

    const count = await prisma.watchlistItem.count({ where: { userId } });
    if (count >= MAX_WATCHLIST_SIZE) {
      throw new Error(`Watchlist limit reached (${MAX_WATCHLIST_SIZE} symbols).`);
    }

    const symbol = await ensureSymbolRecord(ticker, body.name);

    const item = await prisma.watchlistItem.upsert({
      where: {
        userId_symbolId: {
          userId,
          symbolId: symbol.id,
        },
      },
      update: {},
      create: {
        userId,
        symbolId: symbol.id,
      },
      include: { symbol: true },
    });

    return jsonOk(
      {
        id: item.id,
        symbolId: item.symbolId,
        ticker: item.symbol.ticker,
        name: item.symbol.name,
        addedAt: item.addedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
