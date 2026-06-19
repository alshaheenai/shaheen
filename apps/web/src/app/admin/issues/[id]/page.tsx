import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import type { IssueBody } from "@/lib/pipeline/types";

type Sections = Record<string, { name: string; icon: string }>;
const FALLBACK: Sections = {
  tldr: { name: "نظرة الشاهين", icon: "👁️" },
  main: { name: "الانقضاضة", icon: "⚡️" },
  roundup: { name: "رفّة جناح", icon: "🪶" },
  tools: { name: "عُدّة الشاهين", icon: "🛠️" },
  gift: { name: "غنيمة اليوم", icon: "🎁" },
};

function SectionTitle({ s }: { s: { name: string; icon: string } }) {
  return (
    <h2 className="flex items-center gap-2 text-xl font-bold">
      <span>{s.icon}</span>
      {s.name}
    </h2>
  );
}

export default async function IssueDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: issue }, { data: brand }] = await Promise.all([
    supabase.from("draft_issues").select("*").eq("id", id).maybeSingle(),
    supabase.from("brand_config").select("settings").limit(1).maybeSingle(),
  ]);

  if (!issue) notFound();

  const body = (issue.body ?? {}) as unknown as IssueBody;
  const settings = (brand?.settings ?? {}) as { sections?: Sections };
  const sec = { ...FALLBACK, ...(settings.sections ?? {}) };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2 border-b pb-4">
        <Link href="/admin/issues" className="text-sm text-muted-foreground hover:underline">
          ← كل النشرات
        </Link>
        <h1 className="text-3xl font-bold">{issue.title}</h1>
        {issue.intro && <p className="text-lg text-muted-foreground">{issue.intro}</p>}
        <div className="flex gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{issue.issue_date}</Badge>
          {issue.main_topic && <Badge variant="secondary">{issue.main_topic}</Badge>}
        </div>
      </div>

      {/* نظرة الشاهين */}
      {body.tldr_bullets?.length > 0 && (
        <section className="space-y-3">
          <SectionTitle s={sec.tldr} />
          <ul className="list-disc space-y-1 pr-6">
            {body.tldr_bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      )}

      {/* الانقضاضة */}
      {body.main && (
        <section className="space-y-3">
          <SectionTitle s={sec.main} />
          <h3 className="text-lg font-semibold">{body.main.title}</h3>
          <Field label="ماذا حدث؟" value={body.main.what} />
          <Field label="لماذا يهم؟" value={body.main.why} />
          <Field label="من يستفيد؟" value={body.main.who} />
          <Field label="كيف تطبّقه؟" value={body.main.how} />
          {body.main.warning && <Field label="تنبيه" value={body.main.warning} />}
          {body.main.our_take && (
            <div className="rounded-lg border-r-4 border-[#C8932A] bg-muted/40 p-4">
              <div className="mb-1 text-sm font-bold text-[#C8932A]">بعين الشاهين 🦅</div>
              <p>{body.main.our_take}</p>
            </div>
          )}
          {body.main.source_url && <SourceLink url={body.main.source_url} />}
        </section>
      )}

      {/* رفّة جناح */}
      {body.roundup?.length > 0 && (
        <section className="space-y-3">
          <SectionTitle s={sec.roundup} />
          <ul className="space-y-3">
            {body.roundup.map((r) => (
              <li key={r.news_id} className="border-b pb-3">
                <div className="font-semibold">{r.title}</div>
                <p className="text-sm text-muted-foreground">{r.blurb}</p>
                {r.source_url && <SourceLink url={r.source_url} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* عُدّة الشاهين */}
      {body.tools?.length > 0 && (
        <section className="space-y-3">
          <SectionTitle s={sec.tools} />
          <ul className="space-y-3">
            {body.tools.map((t) => (
              <li key={t.news_id} className="border-b pb-3">
                <div className="font-semibold">{t.name}</div>
                <p className="text-sm text-muted-foreground">{t.blurb}</p>
                {t.source_url && <SourceLink url={t.source_url} />}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="font-semibold">{label} </span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}

function SourceLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" dir="ltr" className="block text-xs text-[#1E6FB8] hover:underline">
      {url}
    </a>
  );
}
