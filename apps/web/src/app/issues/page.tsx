import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBrandName } from "@/lib/brand";
import type { IssueBody } from "@/lib/pipeline/types";

export const revalidate = 300;

export const metadata = { title: "كل النشرات" };

export default async function IssuesArchive() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("published_issues")
    .select("slug, title, issue_date, published_at, body, channel_results")
    .order("published_at", { ascending: false })
    .limit(60);

  // Only issues whose blog channel has been published are public.
  const issues = (data ?? []).filter((i) => {
    const cr = (i.channel_results ?? {}) as Record<string, { status?: string }>;
    return cr.blog?.status === "success" && i.slug;
  });

  const name = await getBrandName();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">{name} — كل النشرات</h1>
      {issues.length === 0 ? (
        <p className="text-muted-foreground">لا توجد نشرات منشورة بعد.</p>
      ) : (
        <ul className="space-y-6">
          {issues.map((i) => {
            const body = (i.body ?? {}) as unknown as IssueBody;
            const teaser = body.tldr_bullets?.[0];
            return (
              <li key={i.slug} className="border-b pb-4">
                <Link href={`/issues/${i.slug}`} className="text-xl font-semibold underline">
                  {i.title ?? "نشرة الشاهين"}
                </Link>
                {i.issue_date && <p className="mt-1 text-sm text-muted-foreground">{i.issue_date}</p>}
                {teaser && <p className="mt-2 text-muted-foreground">{teaser}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
