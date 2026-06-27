import { NextResponse, type NextRequest } from "next/server";
import { ingestRssSources } from "@/lib/ingest";
import { alertCronFailure } from "@/lib/cron-alert";

export const runtime = "nodejs";
export const maxDuration = 60;

// Triggered by the scheduler (n8n / cron). Auth via shared secret header.
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-ingest-secret");
  if (!process.env.INGEST_SECRET || secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await ingestRssSources();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    await alertCronFailure("ingest", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
