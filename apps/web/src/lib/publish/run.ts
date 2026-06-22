import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEnabledChannels } from "@/lib/channels";
import type { Json, Tables } from "@/lib/database.types";
import { CHANNEL_ORDER, type ChannelName, type ChannelResult, type ChannelResults } from "@/lib/publish/types";
import { publishBlog } from "@/lib/publish/blog";
import { publishTelegramChannel } from "@/lib/publish/telegram-channel";
import { publishEmail } from "@/lib/publish/email";

export type PublishOptions = {
  channels?: string[]; // default: all channels
  force?: boolean; // re-run channels already at success
  test?: boolean; // admin preview: run requested channels bypassing enablement/blog-dep; does NOT persist channel_results
};

export type PublishOutcome = {
  issueId: string;
  slug: string | null;
  results: ChannelResults;
};

// Orchestrator: the SINGLE writer of published_issues.channel_results.
// Runs channels in CHANNEL_ORDER (blog first); email/telegram are attempted only
// if blog is success (they embed the blog URL). One channel's failure never aborts
// the others. Idempotent: a channel already at success is kept unless force=true.
export async function publishIssue(issueId: string, opts: PublishOptions = {}): Promise<PublishOutcome> {
  const supabase = createAdminClient();
  const { data: issue } = await supabase
    .from("published_issues")
    .select("*")
    .eq("id", issueId)
    .maybeSingle();
  if (!issue) throw new Error(`published_issue ${issueId} not found`);

  const enabled = new Set(await getEnabledChannels());
  const requested = opts.channels?.length ? opts.channels : [...CHANNEL_ORDER];
  const targets = CHANNEL_ORDER.filter((c) => requested.includes(c)); // canonical order, blog first

  const existing = (issue.channel_results ?? {}) as ChannelResults;
  const results: ChannelResults = { ...existing };

  for (const channel of targets) {
    const now = () => new Date().toISOString();

    // Test mode (admin preview) bypasses enablement / idempotency / blog-dependency
    // gating and runs the requested channel directly.
    if (!opts.test) {
      if (!enabled.has(channel)) {
        results[channel] = { status: "skipped", at: now(), summary: { reason: "channel disabled" } };
        continue;
      }
      if (!opts.force && existing[channel]?.status === "success") {
        results[channel] = existing[channel]!;
        continue;
      }
      // Link-bearing channels depend on the blog being live.
      if (channel !== "blog" && results.blog?.status !== "success") {
        results[channel] = { status: "failed", at: now(), summary: { error: "blog not live" } };
        continue;
      }
    }

    try {
      results[channel] = await runChannel(channel, issue, opts.test);
    } catch (e) {
      results[channel] = { status: "failed", at: now(), summary: { error: (e as Error).message } };
    }
  }

  // Never persist channel_results for a test preview (would mask the real channel).
  if (!opts.test) {
    await supabase
      .from("published_issues")
      .update({ channel_results: results as unknown as Json })
      .eq("id", issueId);
  }

  return { issueId, slug: issue.slug, results };
}

async function runChannel(
  channel: ChannelName,
  issue: Tables<"published_issues">,
  test?: boolean
): Promise<ChannelResult> {
  switch (channel) {
    case "blog":
      return publishBlog(issue);
    case "telegram":
      return publishTelegramChannel(issue);
    case "email": {
      const r = await publishEmail(issue, { test });
      // failed only if every attempt failed; partial/no-op (zero active) = success
      const status = r.failed > 0 && r.sent === 0 ? "failed" : "success";
      return { status, at: new Date().toISOString(), summary: r };
    }
  }
}
