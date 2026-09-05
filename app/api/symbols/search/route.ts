import { NextRequest } from "next/server";
import { searchSymbols } from "@/lib/market-data/service";
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response";
import { MarketDataError } from "@/lib/market-data/types";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 1) {
      return jsonOk({ results: [] });
    }

    const results = await searchSymbols(q);
    return jsonOk({ results });
  } catch (error) {
    if (error instanceof MarketDataError) {
      return jsonError(error.message, 503);
    }
    return handleApiError(error);
  }
}
