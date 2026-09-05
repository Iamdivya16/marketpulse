import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response";
import { toNumber } from "@/lib/market-data/cache";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> },
) {
  try {
    await requireUserId();
    const { ticker } = await params;
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "10");

    const symbol = await prisma.symbol.findUnique({
      where: { ticker: ticker.toUpperCase() },
    });
    if (!symbol) {
      return jsonError("Symbol not found", 404);
    }

    const news = await prisma.newsItem.findMany({
      where: { symbolId: symbol.id },
      orderBy: { publishedAt: "desc" },
      take: limit,
    });

    return jsonOk({
      items: news.map((item) => ({
        title: item.title,
        url: item.url,
        source: item.source,
        publishedAt: item.publishedAt.toISOString(),
        sentiment: toNumber(item.sentiment),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
