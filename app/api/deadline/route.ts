import { NextResponse } from "next/server";
import { getDeadlineIso, resetDeadline } from "@/lib/deadline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const deadlineIso = await getDeadlineIso();
    return NextResponse.json({ deadlineIso });
  } catch {
    return NextResponse.json({ error: "Failed to load deadline." }, { status: 500 });
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

  let hours = 24;
  try {
    const body = await request.json();
    if (typeof body?.hours === "number" && body.hours > 0 && body.hours <= 24 * 30) {
      hours = body.hours;
    }
  } catch {
    // no/invalid body -> default to 24h
  }

  try {
    const deadlineIso = await resetDeadline(hours);
    return NextResponse.json({ deadlineIso });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reset deadline.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
