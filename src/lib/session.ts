import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

/**
 * Anonymous session handling (PRD §22: one active job per session; no
 * accounts). The cookie holds only a random token — never user identity,
 * document data or credentials.
 */
export const SESSION_COOKIE = "pdf_session";

export async function getSessionId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

/** Reads the session, creating one when absent (must be called in a Route Handler / Server Action). */
export async function requireSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE)?.value;
  if (existing) return existing;

  const fresh = randomBytes(16).toString("hex");
  store.set(SESSION_COOKIE, fresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
  return fresh;
}
