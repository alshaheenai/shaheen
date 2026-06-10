"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { toggleSource, deleteSource } from "./actions";
import type { Tables } from "@/lib/database.types";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function SourcesTable({ sources }: { sources: Tables<"sources">[] }) {
  const [pending, startTransition] = useTransition();

  function onToggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleSource(id, active);
    });
  }

  function onDelete(id: string, name: string) {
    if (!confirm(`حذف المصدر "${name}"؟`)) return;
    startTransition(async () => {
      await deleteSource(id);
      toast.success("تم الحذف.");
    });
  }

  if (sources.length === 0) {
    return <p className="text-sm text-muted-foreground">لا توجد مصادر بعد.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-right">الاسم</TableHead>
          <TableHead className="text-right">النوع</TableHead>
          <TableHead className="text-right">الثقة</TableHead>
          <TableHead className="text-right">التكرار</TableHead>
          <TableHead className="text-right">آخر سحب</TableHead>
          <TableHead className="text-right">مفعّل</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sources.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">
              {s.name}
              {s.url && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  dir="ltr"
                  className="block max-w-[260px] truncate text-xs text-muted-foreground hover:underline"
                >
                  {s.url}
                </a>
              )}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{s.type}</Badge>
            </TableCell>
            <TableCell>{s.trust_score}</TableCell>
            <TableCell>{s.fetch_interval_minutes}د</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {s.last_fetched_at
                ? new Date(s.last_fetched_at).toLocaleString("ar")
                : "—"}
            </TableCell>
            <TableCell>
              <Switch
                checked={s.active}
                disabled={pending}
                onCheckedChange={(v) => onToggle(s.id, v)}
              />
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => onDelete(s.id, s.name)}
              >
                حذف
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
