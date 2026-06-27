import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/database.types";
import type { IssueBody } from "@/lib/pipeline/types";
import { listActiveOrdered } from "@/lib/subscribers";
import { sendEmail } from "@/lib/email/send";
import { issueEmailHtml } from "@/lib/email/templates";
import { getBrandAdmin } from "@/lib/brand";
import { getBaseUrl, issueUrl } from "@/lib/site";

const TEST_EMAIL = process.env.NEWSLETTER_TEST_EMAIL?.trim() ?? ""; // admin preview address
const BATCH = 50;

type Recipient = { email: string; unsubscribe_token: string | null };
export type EmailResult = { sent: number; skipped: number; failed: number };

// Send the published issue by email. test=true → only the admin address (preview);
// otherwise → all active subscribers. Idempotent per (issue, email) via email_sends:
// recipients already marked 'sent' for this issue are skipped; failures are retriable.
export async function publishEmail(
  issue: Tables<"published_issues">,
  opts: { test?: boolean } = {}
): Promise<EmailResult> {
  const supabase = createAdminClient();

  let recipients: Recipient[];
  if (opts.test) {
    if (!TEST_EMAIL) throw new Error("NEWSLETTER_TEST_EMAIL not set");
    const { data } = await supabase
      .from("subscribers")
      .select("unsubscribe_token")
      .eq("email", TEST_EMAIL)
      .maybeSingle();
    recipients = [{ email: TEST_EMAIL, unsubscribe_token: data?.unsubscribe_token ?? "preview" }];
  } else {
    recipients = await listActiveOrdered();
  }
  if (recipients.length === 0) return { sent: 0, skipped: 0, failed: 0 };

  // idempotency: emails already delivered for this issue
  const { data: prior } = await supabase
    .from("email_sends")
    .select("email")
    .eq("published_issue_id", issue.id)
    .eq("status", "sent");
  const alreadySent = new Set((prior ?? []).map((r) => r.email));

  // shared render context
  const brand = await getBrandAdmin();
  const brandName = brand?.name?.trim() || process.env.NEXT_PUBLIC_BRAND_NAME || "الشاهين";
  const base = await getBaseUrl();
  const webUrl = issue.slug ? await issueUrl(issue.slug) : base;
  let intro: string | null = null;
  if (issue.draft_issue_id) {
    const { data: draft } = await supabase
      .from("draft_issues")
      .select("intro")
      .eq("id", issue.draft_issue_id)
      .maybeSingle();
    intro = draft?.intro ?? null;
  }
  const body = (issue.body ?? {}) as unknown as IssueBody;

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    for (const r of batch) {
      if (alreadySent.has(r.email)) {
        skipped++;
        continue;
      }
      const token = r.unsubscribe_token ?? "preview";
      const unsubscribeUrl = `${base}/api/unsubscribe?token=${encodeURIComponent(token)}`;
      const { subject, html } = issueEmailHtml({
        brandName,
        issue: { title: issue.title, issue_date: issue.issue_date, intro, body },
        webUrl,
        unsubscribeUrl,
      });
      try {
        const res = await sendEmail({
          to: r.email,
          subject,
          html,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          // Real sends use a stable key (issue+email) to prevent duplicates. Test
          // previews omit it so the admin can re-preview the same issue after editing
          // the template without Resend returning 409 (same key, changed payload).
          idempotencyKey: opts.test ? undefined : `issue-${issue.id}-${r.email}`,
        });
        await supabase.from("email_sends").upsert(
          { published_issue_id: issue.id, email: r.email, status: "sent", resend_id: res.id ?? null, sent_at: new Date().toISOString() },
          { onConflict: "published_issue_id,email" }
        );
        sent++;
      } catch (err) {
        console.error("email send failed", r.email, err);
        await supabase.from("email_sends").upsert(
          { published_issue_id: issue.id, email: r.email, status: "failed", sent_at: new Date().toISOString() },
          { onConflict: "published_issue_id,email" }
        );
        failed++;
      }
    }
    if (i + BATCH < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { sent, skipped, failed };
}
