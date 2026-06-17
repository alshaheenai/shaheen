import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/database.types";

export type Brand = Tables<"brand_config">;

const FALLBACK_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? "الشاهين";

// Single source of truth for brand identity. DB row wins; env is the fallback.
export async function getBrand(): Promise<Brand | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("brand_config").select("*").limit(1).maybeSingle();
  return data;
}

// Same as getBrand() but via the service-role client — for background jobs
// (publishing) that run without a user session.
export async function getBrandAdmin(): Promise<Brand | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("brand_config").select("*").limit(1).maybeSingle();
  return data;
}

export async function getBrandName(): Promise<string> {
  const brand = await getBrand();
  return brand?.name?.trim() || FALLBACK_NAME;
}
