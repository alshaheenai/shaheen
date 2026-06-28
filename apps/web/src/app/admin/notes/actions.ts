"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPostHogClient } from "@/lib/posthog";

export type NoteFormState = { ok: boolean; error?: string };

// All writes go through the SSR session client, so RLS (`is_admin()`) gates them —
// mirroring sources/actions.ts. The build job reads notes via the service-role client.

export async function createNote(
  _prev: NoteFormState,
  formData: FormData
): Promise<NoteFormState> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "نص النصيحة مطلوب." };

  const supabase = await createClient();
  const { error } = await supabase.from("editorial_notes").insert({ body });
  if (error) return { ok: false, error: error.message };

  const { data: { user } } = await supabase.auth.getUser();
  getPostHogClient().capture({
    distinctId: user?.id ?? "system",
    event: "editorial_note_created",
    properties: {},
  });
  revalidatePath("/admin/notes");
  return { ok: true };
}

export async function updateNote(id: string, body: string): Promise<NoteFormState> {
  const text = body.trim();
  if (!text) return { ok: false, error: "نص النصيحة مطلوب." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("editorial_notes")
    .update({ body: text, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  const { data: { user } } = await supabase.auth.getUser();
  getPostHogClient().capture({
    distinctId: user?.id ?? "system",
    event: "editorial_note_updated",
    properties: { note_id: id },
  });
  revalidatePath("/admin/notes");
  return { ok: true };
}

export async function toggleNote(id: string, active: boolean) {
  const supabase = await createClient();
  await supabase
    .from("editorial_notes")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  const { data: { user } } = await supabase.auth.getUser();
  getPostHogClient().capture({
    distinctId: user?.id ?? "system",
    event: "editorial_note_toggled",
    properties: { note_id: id, active },
  });
  revalidatePath("/admin/notes");
}

export async function deleteNote(id: string) {
  const supabase = await createClient();
  await supabase.from("editorial_notes").delete().eq("id", id);
  const { data: { user } } = await supabase.auth.getUser();
  getPostHogClient().capture({
    distinctId: user?.id ?? "system",
    event: "editorial_note_deleted",
    properties: { note_id: id },
  });
  revalidatePath("/admin/notes");
}
