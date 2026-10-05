import { NextResponse } from "next/server";

/**
 * GET /api/health — liveness probe for hosting platforms (Render/Koyeb/etc.).
 * Deliberately reports nothing about internals (no version/paths/state) and
 * requires no session.
 */
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true });
}
