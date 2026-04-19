import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  createSession,
  createUser,
  getSessionCookieOptions,
  hashPassword,
} from "@/src/lib/auth";
import { registerSchema } from "@/src/lib/auth-validation";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth-config";

export async function POST(request: Request) {
  const expectedInviteCode = process.env.INVITE_CODE?.trim();

  if (!expectedInviteCode) {
    return NextResponse.json(
      { message: "Регистрация по коду доступа пока недоступна." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Некорректные данные формы.",
        issues: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  if (parsed.data.inviteCode.trim() !== expectedInviteCode) {
    return NextResponse.json(
      { message: "Неверный код доступа." },
      { status: 403 }
    );
  }

  const login = parsed.data.login.trim();
  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const user = await createUser({
      login,
      passwordHash,
    });

    const session = await createSession(user.id);
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          login: user.login,
        },
      },
      { status: 201 }
    );

    response.cookies.set(
      SESSION_COOKIE_NAME,
      session.id,
      getSessionCookieOptions(session.expiresAt)
    );

    return response;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Этот логин уже занят." },
        { status: 409 }
      );
    }

    throw error;
  }
}
