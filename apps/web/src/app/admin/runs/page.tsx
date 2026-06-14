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

type Tokens = { prompt?: number; completion?: number; total?: number; cost?: number; calls?: number };
type RunState = {
  candidates?: number;
  relevance_dropped?: number;
  draft_id?: string;
  tokens?: Tokens;
};

const STATUS: Record<string, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  completed: { label: "اكتمل", variant: "default" },
  running: { label: "يعمل", variant: "secondary" },
  failed: { label: "فشل", variant: "destructive" },
};

const nf = new Intl.NumberFormat("en-US");
const money = (n: number) => `$${n.toFixed(4)}`;

function duration(start: string, end: string | null): string {
  if (!end) return "—";
  const s = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}د ${s % 60}ث` : `${s}ث`;
}

export default async function RunsPage() {
  const supabase = await createClient();
  const { data: runs } = await supabase
    .from("pipeline_runs")
    .select("id, type, status, started_at, finished_at, state, error")
    .order("started_at", { ascending: false })
    .limit(50);

  const list = runs ?? [];
  const totalTokens = list.reduce((a, r) => a + (((r.state as RunState)?.tokens?.total) ?? 0), 0);
  const totalCost = list.reduce((a, r) => a + (((r.state as RunState)?.tokens?.cost) ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تشغيلات النظام والاستهلاك</h1>
        <p className="text-muted-foreground">كل مرة يبني فيها المحرك عدداً: التوكنات المصروفة والتكلفة.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="عدد التشغيلات" value={nf.format(list.length)} />
        <Stat label="إجمالي التوكنات" value={nf.format(totalTokens)} />
        <Stat label="إجمالي التكلفة" value={money(totalCost)} />
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد تشغيلات بعد.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الوقت</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">مرشحون</TableHead>
              <TableHead className="text-right">توكنات</TableHead>
              <TableHead className="text-right">استدعاءات</TableHead>
              <TableHead className="text-right">التكلفة</TableHead>
              <TableHead className="text-right">المدة</TableHead>
              <TableHead className="text-right">العدد</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((r) => {
              const st = (r.state ?? {}) as RunState;
              const tok = st.tokens ?? {};
              const status = STATUS[r.status] ?? { label: r.status, variant: "secondary" as const };
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.started_at).toLocaleString("ar")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>{st.candidates ?? "—"}</TableCell>
                  <TableCell className="font-medium">{tok.total ? nf.format(tok.total) : "—"}</TableCell>
                  <TableCell>{tok.calls ?? "—"}</TableCell>
                  <TableCell>{tok.cost != null ? money(tok.cost) : "—"}</TableCell>
                  <TableCell className="text-xs">{duration(r.started_at, r.finished_at)}</TableCell>
                  <TableCell>
                    {st.draft_id ? (
                      <Link href={`/admin/issues/${st.draft_id}`} className="text-xs text-[#1E6FB8] hover:underline">
                        عرض
                      </Link>
                    ) : r.error ? (
                      <span className="text-xs text-destructive" title={r.error}>خطأ</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-medium" dir="ltr">{value}</div>
    </div>
  );
}
