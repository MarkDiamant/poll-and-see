import { NextResponse } from "next/server";

type EmbedRequestBody = {
  website?: string;
  pollText?: string;
  email?: string;
  source?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EmbedRequestBody;

    const website = body.website?.trim();
    const pollText = body.pollText?.trim();
    const email = body.email?.trim();
    const source = body.source?.trim() || "embed page";

    if (!website || !pollText || !email) {
      return NextResponse.json(
        { error: "Website, poll text, and email are required." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase environment variables are missing." },
        { status: 500 }
      );
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/embed_requests`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        website,
        poll_text: pollText,
        email,
        source,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not save request." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Could not submit request." },
      { status: 500 }
    );
  }
}