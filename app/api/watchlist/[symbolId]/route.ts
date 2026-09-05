import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ symbolId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { symbolId } = await params;

    const item = await prisma.watchlistItem.findFirst({
      where: { userId, symbolId },
    });

    if (!item) {
      return jsonError("Symbol not found in watchlist", 404);
    }

    await prisma.watchlistItem.delete({ where: { id: item.id } });
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
