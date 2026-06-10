"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SourceFormState = { ok: boolean; error?: string };

const ALLOWED_TYPES = ["rss", "github", "producthunt", "site", "x", "newsletter"];

export async function createSource(
  _prev: SourceFormState,
  formData: FormData
): Promise<SourceFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const trust = Number(formData.get("trust_score") ?? 50);
  const interval = Number(formData.get("fetch_interval_minutes") ?? 60);

  if (!name) return { ok: false, error: "الاسم مطلوب." };
  if (!ALLOWED_TYPES.includes(type)) return { ok: false, error: "نوع غير صالح." };

  const supabase = await createClient();
  const { error } = await supabase.from("sources").insert({
    name,
    type,
    url: url || null,
    trust_score: Number.isFinite(trust) ? trust : 50,
    fetch_interval_minutes: Number.isFinite(interval) ? interval : 60,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/sources");
  return { ok: true };
}

export async function toggleSource(id: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("sources").update({ active }).eq("id", id);
  revalidatePath("/admin/sources");
}

export async function deleteSource(id: string) {
  const supabase = await createClient();
  await supabase.from("sources").delete().eq("id", id);
  revalidatePath("/admin/sources");
}
