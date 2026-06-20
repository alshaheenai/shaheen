import "server-only";
import { getBrandAdmin } from "@/lib/brand";

// Absolute base URL for links embedded in emails/Telegram (no request context in jobs).
// Prefers NEXT_PUBLIC_SITE_URL; falls back to the brand domain; then localhost dev.
export async function getBaseUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/+$/, "");

  const brand = await getBrandAdmin();
  const domain = (brand?.settings as { domain?: string } | null)?.domain?.trim();
  if (domain) return `https://${domain}`;

  return "http://localhost:3210";
}

export async function issueUrl(slug: string): Promise<string> {
  const base = await getBaseUrl();
  return `${base}/issues/${slug}`;
}

// Derive the public origin from a request's forwarded headers (behind a reverse
// proxy like Traefik, request.url is the internal container address e.g. 0.0.0.0:3000).
export function originFromRequest(request: Request): string {
  const h = request.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? new URL(request.url).origin;
}
