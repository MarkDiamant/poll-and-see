import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PollRow = {
  id: number;
  question: string;
  description: string;
  category: string;
  slug: string;
  created_at: string;
};

type PollOptionRow = {
  id: number;
  poll_id: number;
  option_text: string;
  created_at: string;
};

type SubscriberRow = {
  id: number;
  email: string;
  category_preferences: string[] | null;
  is_active: boolean;
};

type PollWithOptions = PollRow & {
  options: string[];
};

const CATEGORY_COLOURS: Record<
  string,
  { text: string; bg: string; border: string }
> = {
  All: {
    text: "#e5e7eb",
    bg: "#1f2937",
    border: "#4b5563",
  },
  Business: {
    text: "#93c5fd",
    bg: "#172554",
    border: "#2563eb",
  },
  Community: {
    text: "#fca5a5",
    bg: "#2b171b",
    border: "#ef4444",
  },
  Education: {
    text: "#fde68a",
    bg: "#2a1f0a",
    border: "#f59e0b",
  },
  Finance: {
    text: "#86efac",
    bg: "#052e16",
    border: "#22c55e",
  },
  Fun: {
    text: "#f9a8d4",
    bg: "#3b1028",
    border: "#ec4899",
  },
  General: {
    text: "#67e8f9",
    bg: "#083344",
    border: "#06b6d4",
  },
  Lifestyle: {
    text: "#d8b4fe",
    bg: "#2e1065",
    border: "#a855f7",
  },
  Health: {
    text: "#fdba74",
    bg: "#431407",
    border: "#f97316",
  },
  Politics: {
    text: "#fcd34d",
    bg: "#422006",
    border: "#eab308",
  },
  Sport: {
    text: "#c4b5fd",
    bg: "#2e1065",
    border: "#8b5cf6",
  },
  Sports: {
    text: "#c4b5fd",
    bg: "#2e1065",
    border: "#8b5cf6",
  },
  Tech: {
    text: "#f9a8d4",
    bg: "#3b0764",
    border: "#d946ef",
  },
};

const FALLBACK_CATEGORY_COLOURS = [
  { text: "#93c5fd", bg: "#172554", border: "#2563eb" },
  { text: "#fca5a5", bg: "#2b171b", border: "#ef4444" },
  { text: "#fde68a", bg: "#2a1f0a", border: "#f59e0b" },
  { text: "#86efac", bg: "#052e16", border: "#22c55e" },
  { text: "#67e8f9", bg: "#083344", border: "#06b6d4" },
  { text: "#d8b4fe", bg: "#2e1065", border: "#a855f7" },
  { text: "#fdba74", bg: "#431407", border: "#f97316" },
  { text: "#fcd34d", bg: "#422006", border: "#eab308" },
  { text: "#c4b5fd", bg: "#2e1065", border: "#8b5cf6" },
  { text: "#f9a8d4", bg: "#3b0764", border: "#d946ef" },
];

function getCategoryColours(category: string) {
  const trimmed = category?.trim();

  if (!trimmed) {
    return CATEGORY_COLOURS.All;
  }

  if (CATEGORY_COLOURS[trimmed]) {
    return CATEGORY_COLOURS[trimmed];
  }

  let hash = 0;
  for (let i = 0; i < trimmed.length; i += 1) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
  }

  return FALLBACK_CATEGORY_COLOURS[Math.abs(hash) % FALLBACK_CATEGORY_COLOURS.length];
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getLookbackHours(now: Date) {
  const utcDay = now.getUTCDay();
  return utcDay === 0 ? 48 : 24;
}

function buildDigestEmail(params: {
  polls: PollWithOptions[];
  appBaseUrl: string;
  unsubscribeUrl: string;
}) {
  const logoUrl = `${params.appBaseUrl}/logo.png`;

  const pollsHtml = params.polls
    .map((poll) => {
      const pollUrl = `${params.appBaseUrl}/poll/${poll.slug}`;
      const categoryColours = getCategoryColours(poll.category);

      const optionsHtml = poll.options
        .slice(0, 4)
        .map(
          (option) => `
            <tr>
              <td style="padding: 0 0 12px 0;">
                <a
                  href="${pollUrl}"
                  style="
                    display: block;
                    background: #374151;
                    border-radius: 14px;
                    padding: 14px 16px;
                    font-family: Arial, sans-serif;
                    font-size: 15px;
                    line-height: 22px;
                    color: #ffffff;
                    text-align: center;
                    text-decoration: none;
                  "
                >
                  ${escapeHtml(option)}
                </a>
              </td>
            </tr>
          `
        )
        .join("");

      const descriptionHtml = poll.description?.trim()
        ? `
          <div
            style="
              font-family: Arial, sans-serif;
              font-size: 16px;
              line-height: 26px;
              color: #d1d5db;
              margin: 0 0 18px 0;
            "
          >
            ${escapeHtml(poll.description)}
          </div>
        `
        : "";

      return `
        <tr>
          <td style="padding: 0 0 16px 0;">
            <table
              role="presentation"
              width="100%"
              cellpadding="0"
              cellspacing="0"
              border="0"
              style="
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                background: #1f2937;
                border: 1px solid #374151;
                border-radius: 24px;
                overflow: hidden;
              "
            >
              <tr>
                <td style="padding: 22px 20px 22px 20px;">
                  <div style="margin: 0 0 16px 0;">
                    <span
                      style="
                        display: inline-block;
                        padding: 7px 12px;
                        font-family: Arial, sans-serif;
                        font-size: 12px;
                        line-height: 12px;
                        color: ${categoryColours.text};
                        background: ${categoryColours.bg};
                        border: 1px solid ${categoryColours.border};
                        border-radius: 999px;
                      "
                    >
                      ${escapeHtml(poll.category)}
                    </span>
                  </div>

                  <div
                    style="
                      font-family: Arial, sans-serif;
                      font-size: 20px;
                      line-height: 30px;
                      font-weight: 700;
                      color: #ffffff;
                      margin: 0 0 14px 0;
                    "
                  >
                    ${escapeHtml(poll.question)}
                  </div>

                  ${descriptionHtml}

                  <table
                    role="presentation"
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    style="width: 100%; border-collapse: collapse;"
                  >
                    ${optionsHtml}
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
      const descriptionText = poll.description?.trim() ? `${poll.description}\n\n` : "";
      const optionsText = poll.options.map((option) => `• ${option}`).join("\n");

      return `${poll.category}

${poll.question}

${descriptionText}${optionsText}

Vote:
${pollUrl}`;
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
      <body style="margin: 0; padding: 0; background: #020617;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          Fresh Poll & See questions are live now. Vote and see what others think.
        </div>

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="width: 100%; border-collapse: collapse; background: #020617;"
        >
          <tr>
            <td align="center" style="padding: 28px 14px 36px 14px;">
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="max-width: 640px; width: 100%; border-collapse: collapse;"
              >
                <tr>
                  <td align="center" style="padding: 0 0 24px 0;">
                    <a
                      href="${params.appBaseUrl}"
                      style="display: inline-block; text-decoration: none;"
                    >
                      <img
                        src="${logoUrl}"
                        alt="Poll & See"
                        width="180"
                        style="display: block; width: 180px; max-width: 100%; height: auto; border: 0;"
                      />
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 0 0 20px 0;">
                    <table
                      role="presentation"
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      style="
                        width: 100%;
                        border-collapse: separate;
                        border-spacing: 0;
                        background: #111827;
                        border: 1px solid #1f2937;
                        border-radius: 24px;
                        overflow: hidden;
                      "
                    >
                      <tr>
                        <td style="padding: 28px 22px; text-align: center;">
                          <div
                            style="
                              font-family: Arial, sans-serif;
                              font-size: 32px;
                              line-height: 38px;
                              font-weight: 800;
                              color: #ffffff;
                              margin: 0 0 12px 0;
                            "
                          >
                            New polls today
                          </div>

                          <div
                            style="
                              font-family: Arial, sans-serif;
                              font-size: 16px;
                              line-height: 26px;
                              color: #d1d5db;
                              max-width: 460px;
                              margin: 0 auto;
                            "
                          >
                            Fresh questions are live now. Tap into today’s polls and see what other people think.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${pollsHtml}

                <tr>
                  <td style="padding: 8px 0 0 0;">
                    <table
                      role="presentation"
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      style="
                        width: 100%;
                        border-collapse: separate;
                        border-spacing: 0;
                        background: #111827;
                        border: 1px solid #1f2937;
                        border-radius: 24px;
                        overflow: hidden;
                      "
                    >
                      <tr>
                        <td style="padding: 22px; text-align: center;">
                          <div
                            style="
                              font-family: Arial, sans-serif;
                              font-size: 14px;
                              line-height: 22px;
                              color: #9ca3af;
                              margin: 0 0 14px 0;
                            "
                          >
                            You’re receiving this because you subscribed to Poll & See daily digest emails.
                          </div>

                          <a
                            href="${params.unsubscribeUrl}"
                            style="
                              display: inline-block;
                              padding: 12px 18px;
                              font-family: Arial, sans-serif;
                              font-size: 14px;
                              line-height: 14px;
                              font-weight: 700;
                              color: #e5e7eb;
                              text-decoration: none;
                              background: #1f2937;
                              border: 1px solid #374151;
                              border-radius: 999px;
                            "
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

You’re receiving this because you subscribed to Poll & See daily digest emails.

Unsubscribe:
${params.unsubscribeUrl}`;

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
    const errorText = await response.text();
    console.error("Resend error:", errorText);
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

    const now = new Date();
    const lookbackHours = getLookbackHours(now);
    const cutoff = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000).toISOString();

    const [
      { data: pollsData, error: pollsError },
      { data: subscribersData, error: subscribersError },
    ] = await Promise.all([
      supabaseAdmin
        .from("polls")
        .select("id, question, description, category, slug, created_at")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("subscribers")
        .select("id, email, category_preferences, is_active")
        .eq("is_active", true),
    ]);

    if (pollsError) {
      console.error("Polls query error:", pollsError);
      return NextResponse.json(
        { error: "Could not load polls.", details: pollsError.message },
        { status: 500 }
      );
    }

    if (subscribersError) {
      console.error("Subscribers query error:", subscribersError);
      return NextResponse.json(
        { error: "Could not load subscribers.", details: subscribersError.message },
        { status: 500 }
      );
    }

    const polls = (pollsData || []) as PollRow[];
    const subscribers = (subscribersData || []) as SubscriberRow[];

    if (polls.length === 0 || subscribers.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const pollIds = polls.map((poll) => poll.id);

    const { data: pollOptionsData, error: pollOptionsError } = await supabaseAdmin
      .from("poll_options")
      .select("id, poll_id, option_text, created_at")
      .in("poll_id", pollIds)
      .order("id", { ascending: true });

    if (pollOptionsError) {
      console.error("Poll options query error:", pollOptionsError);
      return NextResponse.json(
        { error: "Could not load poll options.", details: pollOptionsError.message },
        { status: 500 }
      );
    }

    const pollOptions = (pollOptionsData || []) as PollOptionRow[];

    const optionsByPollId = new Map<number, string[]>();

    for (const option of pollOptions) {
      const existing = optionsByPollId.get(option.poll_id) || [];
      existing.push(option.option_text);
      optionsByPollId.set(option.poll_id, existing);
    }

    const pollsWithOptions: PollWithOptions[] = polls.map((poll) => ({
      ...poll,
      options: optionsByPollId.get(poll.id) || [],
    }));

    let sent = 0;

    for (const subscriber of subscribers) {
      const matchingPolls =
        subscriber.category_preferences && subscriber.category_preferences.length > 0
          ? pollsWithOptions.filter((poll) =>
              subscriber.category_preferences?.includes(poll.category)
            )
          : pollsWithOptions;

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

    return NextResponse.json({
      ok: true,
      sent,
      lookbackHours,
    });
  } catch (error) {
    console.error("Digest send error:", error);
    return NextResponse.json(
      { error: "Could not send digest." },
      { status: 500 }
    );
  }
}