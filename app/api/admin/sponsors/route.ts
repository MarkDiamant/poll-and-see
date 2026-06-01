import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isAuthorized(request: NextRequest) {
  const expectedKey = process.env.POLL_ADMIN_KEY;
  const providedKey = request.headers.get("x-admin-key");

  if (!expectedKey) {
    return { ok: false, error: "POLL_ADMIN_KEY is not configured." };
  }

  if (!providedKey || providedKey !== expectedKey) {
    return { ok: false, error: "Unauthorized." };
  }

  return { ok: true };
}

function cleanSponsorPayload(body: Record<string, unknown>) {
  const categories = Array.isArray(body.categories)
    ? body.categories.map(String).map((item) => item.trim()).filter(Boolean)
    : String(body.category || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  return {
    business_name: String(body.business_name || "").trim(),
    headline: String(body.headline || "").trim(),
    logo_url: String(body.logo_url || "").trim() || null,
    cta_text: String(body.cta_text || "").trim(),
    destination_url: String(body.destination_url || "").trim(),
    category: categories.join(","),
    start_at: String(body.start_at || "").trim(),
    end_at: String(body.end_at || "").trim(),
    is_active: Boolean(body.is_active),
    theme: String(body.theme || "default").trim().toLowerCase(),
  };
}

export async function GET(request: NextRequest) {
  const auth = isAuthorized(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabaseAdmin = getAdminClient();

    const { data, error } = await supabaseAdmin
      .from("sponsors")
      .select("id, business_name, headline, logo_url, cta_text, destination_url, category, start_at, end_at, is_active, created_at, theme")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Could not load sponsors." }, { status: 500 });
    }

    return NextResponse.json({ sponsors: data || [] });
  } catch {
    return NextResponse.json({ error: "Could not load sponsors." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = isAuthorized(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabaseAdmin = getAdminClient();
    const body = await request.json();
    const payload = cleanSponsorPayload(body);

    if (
      !payload.business_name ||
      !payload.headline ||
      !payload.cta_text ||
      !payload.destination_url ||
      !payload.category ||
      !payload.start_at ||
      !payload.end_at
    ) {
      return NextResponse.json({ error: "Missing sponsor fields." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("sponsors")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Could not create sponsor." }, { status: 500 });
    }

    return NextResponse.json({ sponsor: data });
  } catch {
    return NextResponse.json({ error: "Could not create sponsor." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = isAuthorized(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabaseAdmin = getAdminClient();
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Invalid sponsor id." }, { status: 400 });
    }

    const payload = cleanSponsorPayload(body);

    const { data, error } = await supabaseAdmin
      .from("sponsors")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Could not update sponsor." }, { status: 500 });
    }

    return NextResponse.json({ sponsor: data });
  } catch {
    return NextResponse.json({ error: "Could not update sponsor." }, { status: 500 });
  }
}