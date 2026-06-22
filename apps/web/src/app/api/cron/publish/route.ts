import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishIssue } from "@/lib/publish/run";

export const runtime = "nodejs";
export const maxDuration = 300;

// Publish trigger. Distributes an Editor-approved (ready) issue to enabled channels.
// Default target is the latest ready issue from the last 36h — covers the
// "review at night, publish next morning" case without sweeping an old backlog
// (limit 1 + 36h window; publish is idempotent). Pass issueId for anything older.
// Invokable manually now; cron-driven at ~03:00 in Phase 10.
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-ingest-secret");
  if (!process.env.INGEST_SECRET || secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    issueId?: string;
    channels?: string[];
    force?: boolean;
    test?: boolean;
  };

  let targetId = body.issueId;
  if (!targetId) {
    const supabase = createAdminClient();
    const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("published_issues")
      .select("id")
      .gte("published_at", cutoff)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) {
      return NextResponse.json({ error: "no ready issue in last 36h" }, { status: 404 });
    }
    targetId = data.id;
  }

  // Admin preview: email-only test send (does not persist channel_results).
  if (body.test) {
    const outcome = await publishIssue(targetId, { test: true, channels: ["email"], force: body.force });
    return NextResponse.json(outcome);
  }

  const outcome = await publishIssue(targetId, { channels: body.channels, force: body.force });

  // Make a freshly-published issue appear on the blog promptly.
  if (outcome.results.blog?.status === "success") {
    revalidatePath("/issues");
    if (outcome.slug) revalidatePath(`/issues/${outcome.slug}`);
  }

  return NextResponse.json(outcome);
}
