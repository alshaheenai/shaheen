import { NextResponse, type NextRequest } from "next/server";
import { buildDailyIssue } from "@/lib/pipeline/run";

export const runtime = "nodejs";
export const maxDuration = 300;

// Triggered by scheduler (n8n / cron). Builds today's draft issue.
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-ingest-secret");
  if (!process.env.INGEST_SECRET || secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const limit = typeof body?.candidateLimit === "number" ? body.candidateLimit : undefined;

  const result = await buildDailyIssue({ candidateLimit: limit });
  return NextResponse.json(result, { status: result.status === "completed" ? 200 : 500 });
}
