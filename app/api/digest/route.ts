import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PollRow = {
  id: number;
  question: string;
  category: string;
  slug: string;
  created_at: string;
};

type SubscriberRow = {
  id: number;
  email: string;
  category_preferences: string[] | null;
  is_active: boolean;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildDigestEmail(params: {
  polls: PollRow[];
  appBaseUrl: string;
  unsubscribeUrl: string;
}) {
  const logoUrl = `${params.appBaseUrl}/logo.png`;

  const pollsHtml = params.polls
    .map((poll) => {
      const pollUrl = `${params.appBaseUrl}/poll/${poll.slug}`;

      return `
        <tr>
          <td style="padding: 0 0 18px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; background: #111827; border: 1px solid #1f2937; border-radius: 18px;">
              <tr>
                <td style="padding: 22px;">
                  <div style="font-family: Arial, sans-serif; font-size: 12px; line-height: 18px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #60a5fa; margin-bottom: 10px;">
                    ${escapeHtml(poll.category)}
                  </div>

                  <div style="font-family: Arial, sans-serif; font-size: 22px; line-height: 30px; font-weight: 700; color: #ffffff; margin-bottom: 18px;">
                    ${escapeHtml(poll.question)}
                  </div>

                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" bgcolor="#2563eb" style="border-radius: 999px;">
                        <a
                          href="${pollUrl}"
                          style="display: inline-block; padding: 14px 22px; font-family: Arial, sans-serif; font-size: 15px; line-height: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 999px;"
                        >
                          Vote now
                        </a>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join("");

  const pollsText = params.polls
    .map((poll) => {
      const pollUrl = `${params.appBaseUrl}/poll/${poll.slug}`;
      return `${poll.category}\n${poll.question}\nVote now: ${pollUrl}`;
    })
    .join("\n\n--------------------\n\n");

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>New polls today</title>
      </head>
      <body style="margin: 0; padding: 0; background: #030712;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          Fresh Poll & See questions are live now. Vote and see what others think.
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; background: #030712;">
          <tr>
            <td align="center" style="padding: 32px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 640px; width: 100%; border-collapse: collapse;">
                
                <tr>
                  <td align="center" style="padding: 0 0 24px 0;">
                    <img
                      src="${logoUrl}"
                      alt="Poll & See"
                      width="180"
                      style="display: block; width: 180px; max-width: 100%; height: auto; border: 0;"
                    />
                  </td>
                </tr>

                <tr>
                  <td style="padding: 0 0 24px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; background: linear-gradient(180deg, #111827 0%, #0f172a 100%); border: 1px solid #1f2937; border-radius: 24px;">
                      <tr>
                        <td style="padding: 32px 24px; text-align: center;">
                          <div style="font-family: Arial, sans-serif; font-size: 32px; line-height: 38px; font-weight: 800; color: #ffffff; margin-bottom: 12px;">
                            New polls today
                          </div>
                          <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: #cbd5e1; max-width: 460px; margin: 0 auto;">
                            Fresh questions are live now. Tap into today’s polls and see what other people think.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${pollsHtml}

                <tr>
                  <td style="padding: 10px 0 0 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; background: #0f172a; border: 1px solid #1f2937; border-radius: 20px;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 22px; color: #94a3b8; margin-bottom: 14px;">
                            You’re receiving this because you subscribed to Poll & See daily digest emails.
                          </div>

                          <a
                            href="${params.unsubscribeUrl}"
                            style="display: inline-block; padding: 12px 18px; font-family: Arial, sans-serif; font-size: 14px; line-height: 14px; font-weight: 700; color: #cbd5e1; text-decoration: none; background: #111827; border: 1px solid #334155; border-radius: 999px;"
                          >
                            Unsubscribe
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `New polls today

Fresh questions are live now. Vote and see what others think.

${pollsText}

Unsubscribe: ${params.unsubscribeUrl}`;

  return { html, text };
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (!resendApiKey || !emailFrom) {
    throw new Error("Email provider is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!response.ok) {
    throw new Error("Could not send email.");
  }
}

export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret");
    const digestSecret = process.env.DIGEST_SECRET;

    if (!digestSecret || secret !== digestSecret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const appBaseUrl = process.env.APP_BASE_URL || "https://www.pollandsee.com";

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Digest is not configured." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: pollsData, error: pollsError },
      { data: subscribersData, error: subscribersError },
    ] = await Promise.all([
      supabaseAdmin
        .from("polls")
        .select("id, question, category, slug, created_at")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("subscribers")
        .select("id, email, category_preferences, is_active")
        .eq("is_active", true),
    ]);

    if (pollsError || subscribersError) {
      return NextResponse.json(
        { error: "Could not load digest data." },
        { status: 500 }
      );
    }

    const polls = (pollsData || []) as PollRow[];
    const subscribers = (subscribersData || []) as SubscriberRow[];

    if (polls.length === 0 || subscribers.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    let sent = 0;

    for (const subscriber of subscribers) {
      const matchingPolls =
        subscriber.category_preferences && subscriber.category_preferences.length > 0
          ? polls.filter((poll) =>
              subscriber.category_preferences?.includes(poll.category)
            )
          : polls;

      if (matchingPolls.length === 0) {
        continue;
      }

      const unsubscribeUrl = `${appBaseUrl}/api/unsubscribe?email=${encodeURIComponent(
        subscriber.email
      )}`;

      const emailContent = buildDigestEmail({
        polls: matchingPolls,
        appBaseUrl,
        unsubscribeUrl,
      });

      await sendEmail({
        to: subscriber.email,
        subject: "New polls today",
        html: emailContent.html,
        text: emailContent.text,
      });

      sent += 1;
    }

    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    console.error("Digest send error:", error);
    return NextResponse.json(
      { error: "Could not send digest." },
      { status: 500 }
    );
  }
}