"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateNote, toggleNote, deleteNote } from "./actions";
import type { Tables } from "@/lib/database.types";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function NotesTable({ notes }: { notes: Tables<"editorial_notes">[] }) {
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function onToggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleNote(id, active);
    });
  }

  function onSave(id: string) {
    startTransition(async () => {
      const res = await updateNote(id, draft);
      if (res.ok) {
        toast.success("تم الحفظ.");
        setEditingId(null);
      } else if (res.error) {
        toast.error(res.error);
      }
    });
  }

  function onDelete(id: string) {
    if (!confirm("حذف هذه النصيحة؟")) return;
    startTransition(async () => {
      await deleteNote(id);
      toast.success("تم الحذف.");
    });
  }

  if (notes.length === 0) {
    return <p className="text-sm text-muted-foreground">لا توجد نصائح بعد.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-right">النصيحة</TableHead>
          <TableHead className="text-right">آخر تحديث</TableHead>
          <TableHead className="text-right">فعّالة</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notes.map((n) => (
          <TableRow key={n.id}>
            <TableCell className="max-w-[480px] align-top">
              {editingId === n.id ? (
                <Textarea
                  value={draft}
                  rows={3}
                  disabled={pending}
                  onChange={(e) => setDraft(e.target.value)}
                />
              ) : (
                <span className="whitespace-pre-wrap">{n.body}</span>
              )}
            </TableCell>
            <TableCell className="align-top text-xs text-muted-foreground">
              {new Date(n.updated_at).toLocaleString("ar")}
            </TableCell>
            <TableCell className="align-top">
              <Switch
                checked={n.active}
                disabled={pending || editingId === n.id}
                onCheckedChange={(v) => onToggle(n.id, v)}
              />
            </TableCell>
            <TableCell className="align-top">
              {editingId === n.id ? (
                <div className="flex gap-1">
                  <Button size="sm" disabled={pending} onClick={() => onSave(n.id)}>
                    حفظ
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => setEditingId(null)}
                  >
                    إلغاء
                  </Button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      setEditingId(n.id);
                      setDraft(n.body);
                    }}
                  >
                    تعديل
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => onDelete(n.id)}
                  >
                    حذف
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
