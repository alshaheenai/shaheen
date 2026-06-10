import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  in_review: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  published: "منشور",
  postponed: "مؤجّل",
};

export default async function IssuesPage() {
  const supabase = await createClient();
  const { data: issues } = await supabase
    .from("draft_issues")
    .select("id, issue_date, type, title, main_topic, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الأعداد (مسودات)</h1>
        <p className="text-muted-foreground">المسودات التي ولّدها المحرك. افتح عدداً لمعاينته بهوية الشاهين.</p>
      </div>

      {!issues || issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد مسودات بعد. شغّل المحرك لتوليد عدد.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">العنوان</TableHead>
              <TableHead className="text-right">الموضوع</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/issues/${it.id}`} className="hover:underline">
                    {it.title ?? "—"}
                  </Link>
                </TableCell>
                <TableCell>{it.main_topic ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{it.issue_date ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{STATUS_LABEL[it.status] ?? it.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
