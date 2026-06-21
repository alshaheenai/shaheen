import { NextResponse, type NextRequest } from "next/server";
import { confirmSubscriber } from "@/lib/subscribers";
import { originFromRequest } from "@/lib/site";

export const runtime = "nodejs";

// Double opt-in confirmation link target. Idempotent; redirects to a friendly state.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const ok = token ? await confirmSubscriber(token) : false;
  const base = originFromRequest(request);
  return NextResponse.redirect(`${base}/subscribe?${ok ? "confirmed=1" : "error=invalid"}`);
}
