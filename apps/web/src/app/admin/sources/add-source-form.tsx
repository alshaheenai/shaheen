"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createSource, type SourceFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initial: SourceFormState = { ok: false };

const TYPES = [
  { value: "rss", label: "RSS" },
  { value: "github", label: "GitHub" },
  { value: "producthunt", label: "Product Hunt" },
  { value: "site", label: "موقع" },
  { value: "x", label: "X" },
  { value: "newsletter", label: "نشرة بريدية" },
];

export function AddSourceForm() {
  const [state, formAction, pending] = useActionState(createSource, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("تمت إضافة المصدر.");
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-lg border p-4 md:grid-cols-6 md:items-end"
    >
      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="name">الاسم</Label>
        <Input id="name" name="name" required placeholder="OpenAI Blog" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="type">النوع</Label>
        <Select name="type" defaultValue="rss">
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1 md:col-span-3">
        <Label htmlFor="url">الرابط</Label>
        <Input id="url" name="url" dir="ltr" placeholder="https://…/feed" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="trust_score">الثقة (0-100)</Label>
        <Input id="trust_score" name="trust_score" type="number" min={0} max={100} defaultValue={50} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="fetch_interval_minutes">كل (دقيقة)</Label>
        <Input id="fetch_interval_minutes" name="fetch_interval_minutes" type="number" min={5} defaultValue={60} />
      </div>
      <Button type="submit" disabled={pending} className="md:col-span-1">
        {pending ? "…" : "إضافة"}
      </Button>
    </form>
  );
}
