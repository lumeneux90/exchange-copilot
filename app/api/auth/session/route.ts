import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  deleteExpiredSession,
  getSessionCookieOptions,
  getSessionWithUser,
  isSessionExpired,
} from "@/src/lib/auth";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth-config";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const session = await getSessionWithUser(sessionId);

  if (!session) {
    const response = NextResponse.json({ user: null }, { status: 401 });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  if (isSessionExpired(session.expiresAt)) {
    await deleteExpiredSession(session.id);

    const response = NextResponse.json(
      { user: null, message: "Сессия истекла." },
      { status: 401 }
    );
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  const response = NextResponse.json(
    {
      user: {
        id: session.user.id,
        login: session.user.login,
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
