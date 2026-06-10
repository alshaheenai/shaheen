"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateModel(formData: FormData) {
  const task = String(formData.get("task") ?? "");
  const model = String(formData.get("model") ?? "").trim();
  if (!task || !model) return;

  const supabase = await createClient();
  await supabase.from("ai_models_config").update({ model }).eq("task", task);
  revalidatePath("/admin/models");
}
