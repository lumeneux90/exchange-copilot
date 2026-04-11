import { cookies } from "next/headers";

import { getSessionWithUser, isSessionExpired } from "@/src/lib/auth";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth-config";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  const session = await getSessionWithUser(sessionId);

  if (!session || isSessionExpired(session.expiresAt)) {
    return null;
  }

  return session.user;
}
