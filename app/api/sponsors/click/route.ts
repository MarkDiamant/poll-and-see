import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const sponsorId = Number(body.sponsorId);
    const pageContext = String(body.pageContext || "").trim();
    const category = String(body.category || "").trim();
    const destinationUrl = String(body.destinationUrl || "").trim();

    if (!Number.isInteger(sponsorId) || !destinationUrl) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();

    await supabaseAdmin.from("sponsor_clicks").insert({
      sponsor_id: sponsorId,
      page_context: pageContext || null,
      category: category || null,
      destination_url: destinationUrl,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}