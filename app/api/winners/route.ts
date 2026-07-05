import { NextResponse } from "next/server";
import { getWinnersConfig, saveWinnersConfig, type WinnersConfig } from "@/lib/winners";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getWinnersConfig();
    return NextResponse.json({ config });
  } catch {
    return NextResponse.json({ error: "Failed to load winners." }, { status: 500 });
  }
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 && token === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const data = (body ?? {}) as Partial<WinnersConfig>;
  const config: WinnersConfig = {
    published: Boolean(data.published),
    entries: Array.isArray(data.entries) ? data.entries : [],
  };

  try {
    await saveWinnersConfig(config);
    const saved = await getWinnersConfig();
    return NextResponse.json({ config: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save winners.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
