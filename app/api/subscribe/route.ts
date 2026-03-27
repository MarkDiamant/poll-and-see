import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_CATEGORIES = [
  "Business",
  "Community",
  "Education",
  "Finance",
  "Fun",
  "General",
  "Lifestyle",
];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server subscription is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();

    const rawPreferences: unknown[] | null = Array.isArray(body.categoryPreferences)
      ? (body.categoryPreferences as unknown[])
      : null;

    const categoryPreferences =
      rawPreferences && rawPreferences.length > 0
        ? rawPreferences
            .map((value: unknown) => String(value).trim())
            .filter((value: string) => ALLOWED_CATEGORIES.includes(value))
        : null;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error } = await supabaseAdmin
      .from("subscribers")
      .upsert(
        {
          email,
          category_preferences:
            categoryPreferences && categoryPreferences.length > 0
              ? categoryPreferences
              : null,
          is_active: true,
        },
        { onConflict: "email" }
      );

    if (error) {
      return NextResponse.json(
        { error: "Could not subscribe right now." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not subscribe right now." },
      { status: 500 }
    );
  }
}