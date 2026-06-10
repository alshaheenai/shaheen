import { createClient } from "@/lib/supabase/server";
import { updateModel } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TASK_LABEL: Record<string, string> = {
  classify: "التصنيف",
  score: "التقييم",
  select: "الاختيار",
  verify: "التحقق",
  write: "الكتابة",
  headline: "العنوان والافتتاحية",
  tone: "مراجعة النبرة",
  image_prompt: "برومبت الصورة",
  rate: "تقييم الأخبار",
};

export default async function ModelsPage() {
  const supabase = await createClient();
  const { data: models } = await supabase
    .from("ai_models_config")
    .select("task, model")
    .order("task");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">نماذج الذكاء الاصطناعي</h1>
        <p className="text-muted-foreground">
          النموذج المستخدم لكل مهمة عبر OpenRouter. استخدم معرّف النموذج (مثل
          <code dir="ltr" className="mx-1">google/gemini-2.5-flash</code>).
        </p>
      </div>

      <div className="space-y-2">
        {(models ?? []).map((m) => (
          <form
            key={m.task}
            action={updateModel}
            className="flex items-end gap-3 rounded-lg border p-3"
          >
            <input type="hidden" name="task" value={m.task} />
            <div className="w-40 shrink-0">
              <div className="font-medium">{TASK_LABEL[m.task] ?? m.task}</div>
              <div className="text-xs text-muted-foreground" dir="ltr">{m.task}</div>
            </div>
            <Input name="model" defaultValue={m.model} dir="ltr" className="flex-1" />
            <Button type="submit" variant="outline" size="sm">
              حفظ
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
