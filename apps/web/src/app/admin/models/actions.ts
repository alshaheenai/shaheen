"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPostHogClient } from "@/lib/posthog";

export async function updateModel(formData: FormData) {
  const task = String(formData.get("task") ?? "");
  const model = String(formData.get("model") ?? "").trim();
  if (!task || !model) return;

  const supabase = await createClient();
  await supabase.from("ai_models_config").update({ model }).eq("task", task);
  const { data: { user } } = await supabase.auth.getUser();
  getPostHogClient().capture({
    distinctId: user?.id ?? "system",
    event: "model_updated",
    properties: { task, model },
  });
  revalidatePath("/admin/models");
}
