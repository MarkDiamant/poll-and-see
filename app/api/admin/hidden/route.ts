import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isAuthorized(request: NextRequest) {
  return request.headers.get("x-admin-key") === process.env.POLL_ADMIN_KEY;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  const { data } = await supabase
    .from("poll_submissions")
    .select("*")
    .eq("status", "hidden")
    .order("created_at", { ascending: false });

  return NextResponse.json({ items: data || [] });
}