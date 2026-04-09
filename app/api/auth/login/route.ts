import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createSession,
  findUserByLogin,
  getSessionCookieOptions,
  verifyPassword,
} from "@/src/lib/auth";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth-config";

const loginSchema = z.object({
  login: z.string().trim().min(1, "Введите логин").max(24),
  password: z.string().min(1, "Введите пароль").max(32),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Некорректные данные формы.",
        issues: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const login = parsed.data.login.trim();
  const password = parsed.data.password;

  const user = await findUserByLogin(login);

  if (!user) {
    return NextResponse.json(
      { message: "Неверный логин или пароль." },
      { status: 401 }
    );
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    return NextResponse.json(
      { message: "Неверный логин или пароль." },
      { status: 401 }
    );
  }

  const session = await createSession(user.id);
  const response = NextResponse.json(
    {
      user: {
        id: user.id,
        login: user.login,
      },
    },
    { status: 200 }
  );

  response.cookies.set(
    SESSION_COOKIE_NAME,
    session.id,
    getSessionCookieOptions(session.expiresAt)
  );

  return response;
}
