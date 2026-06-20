import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPostHogClient } from "@/lib/posthog";
import { originFromRequest } from "@/lib/site";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    getPostHogClient().capture({ distinctId: user.id, event: "user_signed_out" });
  }
  await supabase.auth.signOut();
  return NextResponse.redirect(`${originFromRequest(request)}/login`, { status: 303 });
}
