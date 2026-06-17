import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getBrand } from "@/lib/brand";
import type { IssueBody } from "@/lib/pipeline/types";
import { IssueView, type Sections } from "@/components/issue-view";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

// An issue is publicly visible only once the blog channel has been published.
async function getIssue(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("published_issues").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  const cr = (data.channel_results ?? {}) as Record<string, { status?: string }>;
  if (cr.blog?.status !== "success") return null;
  return data;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getIssue(slug);
  if (!issue) return { title: "العدد غير متاح" };
  const body = (issue.body ?? {}) as unknown as IssueBody;
  const title = issue.title ?? "عدد الشاهين";
  const description = body.tldr_bullets?.slice(0, 2).join(" · ") || undefined;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
  };
}

export default async function IssuePage({ params }: Params) {
  const { slug } = await params;
  const issue = await getIssue(slug);
  if (!issue) notFound();

  const brand = await getBrand();
  const settings = (brand?.settings ?? {}) as {
    sections?: Sections;
    voice_examples?: { analysis_label?: string };
  };
  const body = (issue.body ?? {}) as unknown as IssueBody;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <header className="mb-8 border-b pb-6">
        {issue.issue_date && <p className="mb-1 text-sm text-muted-foreground">{issue.issue_date}</p>}
        <h1 className="text-3xl font-bold">{issue.title ?? "عدد الشاهين"}</h1>
      </header>

      <IssueView
        body={body}
        sections={settings.sections}
        analysisLabel={settings.voice_examples?.analysis_label}
      />

      <footer className="mt-10 border-t pt-6 text-sm">
        <Link href="/issues" className="underline">
          كل الأعداد
        </Link>
      </footer>
    </main>
  );
}
