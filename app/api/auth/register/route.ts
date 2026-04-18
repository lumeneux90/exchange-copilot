import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createSession,
  createUser,
  getSessionCookieOptions,
  hashPassword,
} from "@/src/lib/auth";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth-config";

const registerSchema = z
  .object({
    login: z
      .string()
      .trim()
      .min(3, "Логин не может быть короче 3 символов.")
      .max(24),
    password: z
      .string()
      .min(8, "Пароль не может быть короче 8 символов.")
      .max(32, "Пароль не может быть длиннее 32 символов."),
    confirmPassword: z
      .string()
      .min(1, "Подтвердите пароль.")
      .max(32, "Пароль не может быть длиннее 32 символов."),
    inviteCode: z.string().trim().min(1, "Введите код доступа."),
  })
  .superRefine(({ password, confirmPassword }, context) => {
    if (password !== confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Пароли не совпадают.",
        path: ["confirmPassword"],
      });
    }
  });

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
