import { requireUserId } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response";
import { createSnapshotForUser } from "@/lib/snapshots/service";

export async function POST() {
  try {
    const userId = await requireUserId();
    const result = await createSnapshotForUser(userId);
    return jsonOk({
      snapshotId: result.snapshotId,
      checkedAt: result.checkedAt.toISOString(),
      dataAsOf: result.dataAsOf.toISOString(),
      degraded: result.degraded,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("watchlist")) {
      return jsonError(error.message, 400);
    }
    return handleApiError(error);
  }
}
