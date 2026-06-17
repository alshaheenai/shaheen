import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishIssue } from "@/lib/publish/run";

export const runtime = "nodejs";
export const maxDuration = 300;

// Publish trigger. Distributes an Editor-approved (ready) issue to enabled channels.
// Default target is TODAY'S ready issue only — it never sweeps a backlog of older
// approved-but-undistributed issues (pass issueId explicitly for those).
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
  };

  let targetId = body.issueId;
  if (!targetId) {
    const supabase = createAdminClient();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const { data } = await supabase
      .from("published_issues")
      .select("id")
      .eq("issue_date", today)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) {
      return NextResponse.json({ error: "no ready issue for today" }, { status: 404 });
    }
    targetId = data.id;
  }

  const outcome = await publishIssue(targetId, { channels: body.channels, force: body.force });

  // Make a freshly-published issue appear on the blog promptly.
  if (outcome.results.blog?.status === "success") {
    revalidatePath("/issues");
    if (outcome.slug) revalidatePath(`/issues/${outcome.slug}`);
  }

  return NextResponse.json(outcome);
}
