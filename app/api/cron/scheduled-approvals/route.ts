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

function getBaseUrl(request: NextRequest) {
  const appBaseUrl = process.env.APP_BASE_URL;
  if (appBaseUrl) return appBaseUrl;

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";

  return host ? `${protocol}://${host}` : "https://www.pollandsee.com";
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const adminKey = process.env.POLL_ADMIN_KEY;

  if (!adminKey) {
    return NextResponse.json({ error: "POLL_ADMIN_KEY is not configured." }, { status: 500 });
  }

  try {
    const supabaseAdmin = getAdminClient();
    const now = new Date().toISOString();

    const { data: submissions, error } = await supabaseAdmin
      .from("poll_submissions")
      .select("id")
      .eq("status", "scheduled")
      .lte("scheduled_publish_at", now)
      .order("scheduled_publish_at", { ascending: true })
      .limit(25);

    if (error) {
      return NextResponse.json({ error: "Could not load scheduled submissions." }, { status: 500 });
    }

    const baseUrl = getBaseUrl(request);
    const approved: number[] = [];
    const failed: Array<{ id: number; error: string }> = [];

    for (const submission of submissions || []) {
      try {
        const response = await fetch(
          `${baseUrl}/api/admin/poll-submissions/${submission.id}/approve`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-key": adminKey,
            },
            body: JSON.stringify({}),
          }
        );

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          failed.push({
            id: submission.id,
            error: data?.error || "Approval failed.",
          });
          continue;
        }

        approved.push(submission.id);
      } catch (error) {
        failed.push({
          id: submission.id,
          error: error instanceof Error ? error.message : "Approval failed.",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      approved,
      failed,
    });
  } catch {
    return NextResponse.json({ error: "Could not process scheduled approvals." }, { status: 500 });
  }
}