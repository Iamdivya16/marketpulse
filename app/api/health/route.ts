import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/api/response";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return jsonOk({ status: "ok", db: "connected" });
  } catch {
    return jsonOk({ status: "degraded", db: "disconnected" }, { status: 503 });
  }
}
