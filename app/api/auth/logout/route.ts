import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  deleteSession,
  getSessionCookieOptions,
} from "@/src/lib/auth";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth-config";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    await deleteSession(sessionId);
  }

  const response = NextResponse.json({ success: true }, { status: 200 });

  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    getSessionCookieOptions(new Date(0))
  );

  return response;
}
