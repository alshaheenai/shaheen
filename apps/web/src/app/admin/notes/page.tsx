import { createClient } from "@/lib/supabase/server";
import { AddNoteForm } from "./add-note-form";
import { NotesTable } from "./notes-table";

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("editorial_notes")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">نصيحة الشاهين</h1>
        <p className="text-muted-foreground">
          آراؤك ومعرفتك الثابتة. يطبّقها المحرّك دلالياً على الأعداد القادمة عبر «بعين الشاهين»
          متى تطابق خبراً — بأمانة لتوصيتك. النصيحة فعّالة حتى تعطّلها.
        </p>
      </div>
      <AddNoteForm />
      <NotesTable notes={notes ?? []} />
    </div>
  );
}
