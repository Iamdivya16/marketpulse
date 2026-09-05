import { requireUserId } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response";
import { getSylcDetail } from "@/lib/snapshots/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbolId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { symbolId } = await params;
    const detail = await getSylcDetail(userId, symbolId);

    if (!detail) {
      return jsonError("This symbol is not in your watchlist", 404);
    }

    return jsonOk(detail);
  } catch (error) {
    return handleApiError(error);
  }
}
