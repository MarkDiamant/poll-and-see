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

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM;

    if (resendApiKey && fromEmail) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: ["hello@pollandsee.com"],
          subject: "New Poll & See website embed request",
          html: `
            <p><strong>New embed request</strong></p>
            <p><strong>Website:</strong> ${website}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Poll idea:</strong></p>
            <p>${pollText.replace(/\n/g, "<br />")}</p>
            <p><strong>Source:</strong> ${source}</p>
          `,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Could not submit request." },
      { status: 500 }
    );
  }
}