import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBrand } from "@/lib/brand";
import { buttonVariants } from "@/components/ui/button";
import { SubscribeForm } from "@/components/subscribe-form";
import type { IssueBody } from "@/lib/pipeline/types";

export const revalidate = 300;

export default async function Home() {
  const brand = await getBrand();
  const name = brand?.name?.trim() || process.env.NEXT_PUBLIC_BRAND_NAME || "الشاهين";

  const supabase = await createClient();
  const { data } = await supabase
    .from("published_issues")
    .select("slug, title, issue_date, published_at, body, channel_results")
    .order("published_at", { ascending: false })
    .limit(12);

  // Same visibility filter as /issues; take the latest 6 published.
  const issues = (data ?? [])
    .filter((i) => {
      const cr = (i.channel_results ?? {}) as Record<string, { status?: string }>;
      return cr.blog?.status === "success" && i.slug;
    })
    .slice(0, 6);

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 px-6 py-16 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">{name}</h1>
        {brand?.tagline && (
          <p className="max-w-xl text-lg text-muted-foreground">{brand.tagline}</p>
        )}
        <div className="w-full max-w-md text-start">
          <SubscribeForm />
        </div>
      </section>

      {/* Latest issues */}
      <section className="mx-auto w-full max-w-3xl px-4 pb-16">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">أحدث النشرات</h2>
          {issues.length > 0 && (
            <Link href="/issues" className={buttonVariants({ variant: "outline", size: "sm" })}>
              كل النشرات
            </Link>
          )}
        </div>

        {issues.length === 0 ? (
          <p className="rounded-md bg-muted p-6 text-center text-muted-foreground">
            أول نشرة قريباً — اشترك ليصلك.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {issues.map((i) => {
              const body = (i.body ?? {}) as unknown as IssueBody;
              const teaser = body.tldr_bullets?.[0];
              return (
                <li key={i.slug}>
                  <Link
                    href={`/issues/${i.slug}`}
                    className="block h-full rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    {i.issue_date && (
                      <p className="mb-1 text-xs text-muted-foreground">{i.issue_date}</p>
                    )}
                    <h3 className="mb-2 text-lg font-semibold">{i.title ?? "نشرة الشاهين"}</h3>
                    {teaser && (
                      <p className="line-clamp-3 text-sm text-muted-foreground">{teaser}</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
