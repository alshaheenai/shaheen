import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Read a value from the app_settings key/value table (e.g. publish_time, timezone).
export async function getAppSetting<T = unknown>(key: string): Promise<T | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value ?? null) as T | null;
}
