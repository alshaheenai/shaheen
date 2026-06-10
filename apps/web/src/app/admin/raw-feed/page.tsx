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

export default async function RawFeedPage() {
  const supabase = await createClient();

  const [{ data: items }, { data: sources }] = await Promise.all([
    supabase
      .from("raw_items")
      .select("id, title, url, fetched_at, source_id")
      .order("fetched_at", { ascending: false })
      .limit(100),
    supabase.from("sources").select("id, name"),
  ]);

  const sourceName = new Map((sources ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المحتوى الخام</h1>
        <p className="text-muted-foreground">
          آخر ما جُمع من المصادر قبل المعالجة (أحدث 100).
        </p>
      </div>

      {!items || items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          لا يوجد محتوى بعد. سيظهر هنا حال تشغيل جمع المصادر.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">العنوان</TableHead>
              <TableHead className="text-right">المصدر</TableHead>
              <TableHead className="text-right">وقت السحب</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-medium">
                  {it.url ? (
                    <a href={it.url} target="_blank" rel="noreferrer" className="hover:underline">
                      {it.title ?? "—"}
                    </a>
                  ) : (
                    (it.title ?? "—")
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {(it.source_id && sourceName.get(it.source_id)) ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(it.fetched_at).toLocaleString("ar")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
