import { createClient } from "@/lib/supabase/server";
import { AddSourceForm } from "./add-source-form";
import { SourcesTable } from "./sources-table";

export default async function SourcesPage() {
  const supabase = await createClient();
  const { data: sources } = await supabase
    .from("sources")
    .select("*")
    .order("trust_score", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المصادر</h1>
        <p className="text-muted-foreground">
          من هنا يجمع النظام المحتوى الخام. أضف، فعّل/عطّل، أو احذف أي مصدر.
        </p>
      </div>
      <AddSourceForm />
      <SourcesTable sources={sources ?? []} />
    </div>
  );
}
