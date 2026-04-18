import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import { getPrisma } from "@/src/lib/db";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function findUserByLogin(login: string) {
  const prisma = getPrisma();
  return prisma.user.findUnique({
    where: { login },
  });
}

export async function createUser(params: {
  login: string;
  passwordHash: string;
}) {
  const prisma = getPrisma();
  return prisma.user.create({
    data: {
      login: params.login,
      passwordHash: params.passwordHash,
    },
  });
}

export async function createSession(userId: string) {
  const prisma = getPrisma();
  return prisma.session.create({
    data: {
      id: randomUUID(),
      userId,
      expiresAt: getSessionExpiryDate(),
    },
  });
}

export async function getSessionWithUser(sessionId: string) {
  const prisma = getPrisma();
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: true,
    },
  });
}

export async function deleteSession(sessionId: string) {
  const prisma = getPrisma();
  await prisma.session.deleteMany({
    where: { id: sessionId },
  });
}

export async function deleteExpiredSession(sessionId: string) {
  const prisma = getPrisma();
  await prisma.session.deleteMany({
    where: {
      id: sessionId,
      expiresAt: {
        lte: new Date(),
      },
    },
  });
}

export function isSessionExpired(expiresAt: Date) {
  return expiresAt.getTime() <= Date.now();
}

export function getSessionExpiryDate() {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export function getSessionCookieOptions(
  expiresAt: Date
): Pick<
  ResponseCookie,
  "httpOnly" | "sameSite" | "secure" | "path" | "expires"
> {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}
