import { requireUserId } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { getLatestSnapshot } from "@/lib/snapshots/service";

export async function GET() {
  try {
    const userId = await requireUserId();
    const snapshot = await getLatestSnapshot(userId);

    return jsonOk({
      checkedAt: snapshot?.checkedAt.toISOString() ?? null,
      snapshotId: snapshot?.id ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
