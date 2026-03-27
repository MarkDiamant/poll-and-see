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

async function sendEmail(params: {
  to: string;
  subject: string;
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

    const [{ data: pollsData, error: pollsError }, { data: subscribersData, error: subscribersError }] =
      await Promise.all([
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

      const body = matchingPolls
        .map((poll) => {
          const pollUrl = `${appBaseUrl}/poll/${poll.slug}`;
          return `${poll.question}\n\nVote and see what others think:\n\n${pollUrl}`;
        })
        .join("\n\n--------------------\n\n");

      const unsubscribeUrl = `${appBaseUrl}/api/unsubscribe?email=${encodeURIComponent(
        subscriber.email
      )}`;

      const fullBody = `${body}\n\nUnsubscribe: ${unsubscribeUrl}`;

      await sendEmail({
        to: subscriber.email,
        subject: "New polls today",
        text: fullBody,
      });

      sent += 1;
    }

    return NextResponse.json({ ok: true, sent });
  } catch {
    return NextResponse.json(
      { error: "Could not send digest." },
      { status: 500 }
    );
  }
}