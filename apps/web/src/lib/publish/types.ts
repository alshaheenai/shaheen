// Per-channel distribution result, stored as a keyed map in
// published_issues.channel_results. The publish orchestrator is the single writer.

export type ChannelName = "blog" | "email" | "telegram";

export type ChannelStatus = "success" | "failed" | "skipped";

export type ChannelResult = {
  status: ChannelStatus;
  at: string; // ISO 8601
  summary?: Record<string, unknown>; // channel-specific: { url } | { recipients, failed } | { message_id } | { error }
};

// channel name -> result
export type ChannelResults = Partial<Record<string, ChannelResult>>;

// Canonical order. blog MUST run first: email/telegram embed the blog URL and the
// blog page 404s until blog is live, so link-bearing channels run only after it.
export const CHANNEL_ORDER: ChannelName[] = ["blog", "email", "telegram"];
