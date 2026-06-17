import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ChannelConfig = Record<string, unknown>;

// Channels enabled in publishing_channels. `blog` is the canonical publication
// surface and is always enabled (unless an explicit row disables it); email and
// telegram require an enabled row.
export async function getEnabledChannels(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("publishing_channels").select("channel, enabled");
  const rows = data ?? [];
  const enabled = new Set(rows.filter((r) => r.enabled).map((r) => r.channel));
  const blogDisabled = rows.some((r) => r.channel === "blog" && !r.enabled);
  if (!blogDisabled) enabled.add("blog");
  return [...enabled];
}

export async function getChannelConfig(channel: string): Promise<ChannelConfig> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("publishing_channels")
    .select("config")
    .eq("channel", channel)
    .maybeSingle();
  return (data?.config ?? {}) as ChannelConfig;
}
