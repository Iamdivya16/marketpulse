import { NextRequest } from "next/server";
import { z } from "zod";
import { hashPassword, createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = registerSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return jsonError("An account with this email already exists", 409);
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: await hashPassword(body.password),
      },
    });

    await createSession(user.id);
    return jsonOk({ id: user.id, email: user.email }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
