import type { IssueBody } from "@/lib/pipeline/types";

type SectionLabel = { icon?: string; name?: string };
export type Sections = Record<string, SectionLabel>;

// Shared RTL renderer for a published issue body. Used by the public blog page
// (and reusable by the email template). Purely presentational.
export function IssueView({
  body,
  sections,
  analysisLabel = "بعين الشاهين",
}: {
  body: IssueBody;
  sections?: Sections;
  analysisLabel?: string;
}) {
  const heading = (key: string, fallback: string) => {
    const s = sections?.[key];
    return `${s?.icon ? s.icon + " " : ""}${s?.name ?? fallback}`;
  };
  const main = body.main;

  return (
    <article className="flex flex-col gap-10">
      {body.tldr_bullets?.length ? (
        <section>
          <h2 className="mb-3 text-xl font-bold">{heading("tldr", "نظرة الشاهين")}</h2>
          <ul className="list-disc space-y-1 pe-5 text-muted-foreground">
            {body.tldr_bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {main ? (
        <section>
          <h2 className="mb-3 text-xl font-bold">{heading("main", "الانقضاضة")}</h2>
          <h3 className="mb-2 text-lg font-semibold">{main.title}</h3>
          <div className="space-y-3 leading-relaxed">
            {main.what && <p>{main.what}</p>}
            {main.why && <p>{main.why}</p>}
            {main.who && <p>{main.who}</p>}
            {main.how && <p>{main.how}</p>}
            {main.warning && (
              <p className="text-muted-foreground">⚠️ {main.warning}</p>
            )}
            {main.our_take && (
              <p className="rounded-md border-s-4 bg-muted/40 p-3">
                <strong>{analysisLabel}:</strong> {main.our_take}
              </p>
            )}
          </div>
          {main.source_url && (
            <p className="mt-2 text-sm">
              <a className="underline" href={main.source_url} target="_blank" rel="noreferrer">
                المصدر
              </a>
            </p>
          )}
        </section>
      ) : null}

      {body.roundup?.length ? (
        <section>
          <h2 className="mb-3 text-xl font-bold">{heading("roundup", "رفّة جناح")}</h2>
          <ul className="space-y-3">
            {body.roundup.map((r, i) => (
              <li key={i}>
                <span className="font-semibold">
                  {r.source_url ? (
                    <a className="underline" href={r.source_url} target="_blank" rel="noreferrer">
                      {r.title}
                    </a>
                  ) : (
                    r.title
                  )}
                </span>
                {r.blurb && <span className="text-muted-foreground"> — {r.blurb}</span>}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {body.tools?.length ? (
        <section>
          <h2 className="mb-3 text-xl font-bold">{heading("tools", "عُدّة الشاهين")}</h2>
          <ul className="space-y-3">
            {body.tools.map((t, i) => (
              <li key={i}>
                <span className="font-semibold">
                  {t.source_url ? (
                    <a className="underline" href={t.source_url} target="_blank" rel="noreferrer">
                      {t.name}
                    </a>
                  ) : (
                    t.name
                  )}
                </span>
                {t.blurb && <span className="text-muted-foreground"> — {t.blurb}</span>}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
