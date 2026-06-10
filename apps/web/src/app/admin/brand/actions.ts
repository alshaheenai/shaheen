"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BrandFormState = { ok: boolean; error?: string };

function parseBannedWords(raw: string): string[] {
  return raw
    .split(/[\n,،]/)
    .map((w) => w.trim())
    .filter(Boolean);
}

export async function updateBrand(
  _prev: BrandFormState,
  formData: FormData
): Promise<BrandFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "الاسم مطلوب." };

  const payload = {
    name,
    tagline: String(formData.get("tagline") ?? "").trim() || null,
    tone: String(formData.get("tone") ?? "").trim() || null,
    primary_color: String(formData.get("primary_color") ?? "").trim() || null,
    accent_color: String(formData.get("accent_color") ?? "").trim() || null,
    banned_words: parseBannedWords(String(formData.get("banned_words") ?? "")),
  };

  const supabase = await createClient();
  // RLS gates this update to admins; non-admins are silently no-op'd by policy.
  const { error } = await supabase
    .from("brand_config")
    .update(payload)
    .eq("singleton", true);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/brand");
  revalidatePath("/admin");
  return { ok: true };
}
