import "server-only";
import type { Tables } from "@/lib/database.types";
import type { IssueBody } from "@/lib/pipeline/types";
import type { ChannelResult } from "@/lib/publish/types";
import { issueUrl } from "@/lib/site";

// Publishing to the "blog" makes the issue visible on the public site. There is no
// external call — visibility is derived from channel_results.blog.status === 'success'
// (the orchestrator persists it). Here we validate the issue is renderable and return
// success + the canonical URL. This runs FIRST so link-bearing channels can reference it.
export async function publishBlog(issue: Tables<"published_issues">): Promise<ChannelResult> {
  const at = new Date().toISOString();

  if (!issue.slug) {
    return { status: "failed", at, summary: { error: "issue has no slug" } };
  }

  const body = (issue.body ?? {}) as unknown as IssueBody;
  const renderable =
    !!body &&
    (!!body.main || (body.tldr_bullets?.length ?? 0) > 0 || (body.roundup?.length ?? 0) > 0 || (body.tools?.length ?? 0) > 0);
  if (!renderable) {
    return { status: "failed", at, summary: { error: "empty issue body" } };
  }

  return { status: "success", at, summary: { url: await issueUrl(issue.slug) } };
}
