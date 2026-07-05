import { NextResponse } from "next/server";
import { createSubmission, listSubmissions } from "@/lib/store";
import { validateSubmission } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const submissions = await listSubmissions();
    return NextResponse.json({ submissions });
  } catch {
    return NextResponse.json({ error: "Failed to load submissions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = validateSubmission(body);
  if (!result.ok || !result.value) {
    return NextResponse.json({ errors: result.errors }, { status: 422 });
  }

  try {
    const submission = await createSubmission(result.value);
    return NextResponse.json({ submission }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save submission.";
    return NextResponse.json({ errors: [message] }, { status: 400 });
  }
}
