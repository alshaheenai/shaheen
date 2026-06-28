"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createNote, type NoteFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: NoteFormState = { ok: false };

export function AddNoteForm() {
  const [state, formAction, pending] = useActionState(createNote, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("تمت إضافة النصيحة.");
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <Label htmlFor="body">نصيحة جديدة</Label>
        <Textarea
          id="body"
          name="body"
          required
          rows={3}
          placeholder="مثال: خطة Claude بـ20$ لا تكفي لمشروع جاد — انصح بخطة 115$."
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "إضافة"}
      </Button>
    </form>
  );
}
