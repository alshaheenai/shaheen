"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateBrand, type BrandFormState } from "./actions";
import type { Tables } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: BrandFormState = { ok: false };

export function BrandForm({ brand }: { brand: Tables<"brand_config"> }) {
  const [state, formAction, pending] = useActionState(updateBrand, initial);

  useEffect(() => {
    if (state.ok) toast.success("تم حفظ الهوية.");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">اسم المشروع</Label>
        <Input id="name" name="name" defaultValue={brand.name} required />
        <p className="text-xs text-muted-foreground">
          يظهر في كل العناوين ولوحة التحكم والمدونة. غيّره متى شئت.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tagline">الوصف المختصر (Tagline)</Label>
        <Input id="tagline" name="tagline" defaultValue={brand.tagline ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tone">النبرة والهوية التحريرية</Label>
        <Textarea
          id="tone"
          name="tone"
          rows={4}
          defaultValue={brand.tone ?? ""}
          placeholder="عربي واضح، عملي، موجز…"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primary_color">اللون الأساسي</Label>
          <Input
            id="primary_color"
            name="primary_color"
            dir="ltr"
            defaultValue={brand.primary_color ?? ""}
            placeholder="#0f172a"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accent_color">لون التمييز</Label>
          <Input
            id="accent_color"
            name="accent_color"
            dir="ltr"
            defaultValue={brand.accent_color ?? ""}
            placeholder="#6366f1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="banned_words">الكلمات / الأساليب الممنوعة</Label>
        <Textarea
          id="banned_words"
          name="banned_words"
          rows={3}
          defaultValue={brand.banned_words.join("، ")}
          placeholder="افصل بفاصلة أو سطر جديد"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : "حفظ"}
      </Button>
    </form>
  );
}
