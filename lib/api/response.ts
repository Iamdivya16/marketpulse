import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof AuthError) {
    return jsonError(error.message, 401);
  }
  if (error instanceof ZodError) {
    return jsonError(error.issues[0]?.message ?? "Invalid request", 400);
  }
  if (error instanceof Error && error.message.includes("watchlist")) {
    return jsonError(error.message, 400);
  }
  console.error(error);
  return jsonError("Internal server error", 500);
}
