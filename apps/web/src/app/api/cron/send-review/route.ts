import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReview, tg, ADMIN_CHAT_ID } from "@/lib/telegram";
import { getPostHogClient } from "@/lib/posthog";
import { alertCronFailure } from "@/lib/cron-alert";
import type { Tables } from "@/lib/database.types";

export const runtime = "nodejs";

// Sends the latest in-review draft to the admin's Telegram for approval.
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-ingest-secret");
  if (!process.env.INGEST_SECRET || secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const body = await request.json().catch(() => ({}));
  const draftId = body?.draftId as string | undefined;

  let draft: Tables<"draft_issues"> | undefined;
  if (draftId) {
    // Manual override — send this specific draft as-is (freshness guard exempt).
    const { data } = await supabase.from("draft_issues").select("*").eq("id", draftId).maybeSingle();
    draft = data ?? undefined;
  } else {
    // Automatic nightly path — latest in_review draft, but only if it's fresh.
    const { data } = await supabase
      .from("draft_issues")
      .select("*")
      .eq("status", "in_review")
      .order("created_at", { ascending: false })
      .limit(1);
    const latest = data?.[0];
    // Riyadh is UTC+3 (no DST). Fresh = issue_date no older than yesterday (Riyadh today − 1):
    // a normal nightly draft is dated tomorrow and passes; the 1-day tolerance absorbs the
    // timezone skew in how issue_date is stamped. A weeks-old leftover is rejected.
    const freshFrom = new Date(Date.now() + (3 - 24) * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (!latest?.issue_date || latest.issue_date < freshFrom) {
      // R2: no fresh draft (none, or only stale) — alert instead of sending.
      try {
        await tg("sendMessage", {
          chat_id: ADMIN_CHAT_ID(),
          text: "⚠️ لا مسودة جديدة للمراجعة الليلة — تحقّق من دورة البناء",
        });
      } catch {
        // best-effort; the skipped response below is the source of truth
      }
      return NextResponse.json({ ok: false, skipped: "no_fresh_draft" });
    }
    draft = latest;
  }

  if (!draft) return NextResponse.json({ ok: false, error: "no in_review draft" }, { status: 404 });

  try {
    await sendReview(draft);
    getPostHogClient().capture({
      distinctId: "system",
      event: "draft_sent_for_review",
      properties: { draft_id: draft.id },
    });
    return NextResponse.json({ ok: true, draftId: draft.id });
  } catch (e) {
    await alertCronFailure("send-review", e);
    const msg = e instanceof Error ? e.message : String(e);
    getPostHogClient().captureException(e, "system", { draft_id: draft.id });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
