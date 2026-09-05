import { requireUserId } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api/response";
import { buildSylcFeed } from "@/lib/snapshots/service";

export async function GET() {
  try {
    const userId = await requireUserId();
    const feed = await buildSylcFeed(userId);
    return jsonOk(feed);
  } catch (error) {
    return handleApiError(error);
  }
}
