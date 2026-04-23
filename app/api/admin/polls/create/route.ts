import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CreatePollPayload = {
  email?: string | null;
  emailMeLink?: boolean;
  question?: string;
  description?: string | null;
  category?: string | null;
  options?: string[];
  optionImageUrls?: string[];
  isPrivate?: boolean;
};

type RateLimitStore = Map<string, number[]>;

const BLOCKED_TERMS = [
  "fuck",
  "fucking",
  "shit",
  "cunt",
  "motherfucker",
  "nigger",
  "nigga",
  "faggot",
  "slut",
  "whore",
  "porn",
  "rape",
  "rapist",
  "dick",
  "pussy",
  "cock",
  "blowjob",
  "wank",
  "twat",
];

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
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";

  if (host) {
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.pollandsee.com";
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return "unknown";
}

function getRateLimitStore(): RateLimitStore {
  const globalWithStore = globalThis as typeof globalThis & {
    __pollCreateRateLimit?: RateLimitStore;
  };

  if (!globalWithStore.__pollCreateRateLimit) {
    globalWithStore.__pollCreateRateLimit = new Map<string, number[]>();
  }

  return globalWithStore.__pollCreateRateLimit;
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxCreates = 4;

  const store = getRateLimitStore();
  const existing = store.get(ip) || [];
  const recent = existing.filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= maxCreates) {
    store.set(ip, recent);
    return true;
  }

  recent.push(now);
  store.set(ip, recent);
  return false;
}

function containsBlockedWords(value: string) {
  const normalised = value.toLowerCase();

  return BLOCKED_TERMS.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
    return regex.test(normalised);
  });
}

function makeShareText(question: string, fullLink: string) {
  return `${question}\n\nVote and see what others think:\n\n${fullLink}`;
}

function generateShortId(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}

async function generateUniqueSlug(supabaseAdmin: ReturnType<typeof getAdminClient>) {
  for (let i = 0; i < 20; i += 1) {
    const candidate = generateShortId(6);

    const { data: existingPoll } = await supabaseAdmin
      .from("polls")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!existingPoll) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique short ID.");
}

async function sendPollLinkEmail({
  to,
  question,
  pollUrl,
}: {
  to: string;
  question: string;
  pollUrl: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.POLL_LINK_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: "Your Poll & See poll link",
      html: `
        <p>Your poll is live.</p>
        <p><strong>${question}</strong></p>
        <p><a href="${pollUrl}">${pollUrl}</a></p>
      `,
    }),
  });

  return response.ok;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreatePollPayload;
    const supabaseAdmin = getAdminClient();

    const email = (body.email || "").trim();
    const emailMeLink = Boolean(body.emailMeLink);
    const question = (body.question || "").trim();
    const description = (body.description || "").trim();
    const category = (body.category || "General").trim() || "General";
    const options = (body.options || []).map((option) => option.trim()).filter(Boolean);
    const optionImageUrls = (body.optionImageUrls || []).map((url) => url.trim());
    const hasAnyImageUrls = optionImageUrls.some(Boolean);
    const cleanedImageUrls = hasAnyImageUrls ? optionImageUrls : [];
    const isPrivate = Boolean(body.isPrivate);

    if (!question) {
      return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
    }

    if (question.length > 150) {
      return NextResponse.json({ error: "Question must be 150 characters or fewer." }, { status: 400 });
    }

    if (description.length > 200) {
      return NextResponse.json({ error: "Description must be 200 characters or fewer." }, { status: 400 });
    }

    if (options.length < 2) {
      return NextResponse.json({ error: "Minimum 2 options required." }, { status: 400 });
    }

    if (options.length > 6) {
      return NextResponse.json({ error: "Maximum 6 options allowed." }, { status: 400 });
    }

    if (options.some((option) => option.length > 40)) {
      return NextResponse.json({ error: "Each option must be 40 characters or fewer." }, { status: 400 });
    }

    if (cleanedImageUrls.length > 0 && cleanedImageUrls.length !== options.length) {
      return NextResponse.json(
        { error: "If image mode is enabled, every option must include an image URL." },
        { status: 400 }
      );
    }

    if (emailMeLink && !email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const blockedSource = [question, description, ...options].join(" ");
    if (containsBlockedWords(blockedSource)) {
      return NextResponse.json(
        { error: "Please rephrase your question to meet our guidelines." },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Please wait a few minutes before creating another poll." },
        { status: 429 }
      );
    }

    const slug = await generateUniqueSlug(supabaseAdmin);
    const baseUrl = getBaseUrl(request);
    const pollUrl = `${baseUrl}/poll/${slug}`;

    const { data: insertedPoll, error: pollInsertError } = await supabaseAdmin
      .from("polls")
      .insert({
        question,
        description,
        category,
        slug,
        featured: false,
        is_private: isPrivate,
        is_publicly_listed: false,
        total_votes: 0,
      })
      .select("id, slug")
      .single();

    if (pollInsertError || !insertedPoll) {
      return NextResponse.json(
        { error: pollInsertError?.message || "Could not create poll." },
        { status: 500 }
      );
    }

    const optionRows = options.map((optionText, index) => ({
      poll_id: insertedPoll.id,
      option_text: optionText,
      vote_count: 0,
      image_url: cleanedImageUrls[index] || null,
    }));

    const { error: optionsInsertError } = await supabaseAdmin
      .from("poll_options")
      .insert(optionRows);

    if (optionsInsertError) {
      await supabaseAdmin.from("polls").delete().eq("id", insertedPoll.id);
      return NextResponse.json(
        { error: optionsInsertError.message || "Could not create poll options." },
        { status: 500 }
      );
    }

    const { error: submissionInsertError } = await supabaseAdmin
      .from("poll_submissions")
      .insert({
        poll_id: insertedPoll.id,
        name: null,
        email: emailMeLink ? email : null,
        question,
        description: description || null,
        category,
        options,
        option_image_urls: cleanedImageUrls.length > 0 ? cleanedImageUrls : null,
        is_private: isPrivate,
        status: "pending",
      });

    if (submissionInsertError) {
      await supabaseAdmin.from("poll_options").delete().eq("poll_id", insertedPoll.id);
      await supabaseAdmin.from("polls").delete().eq("id", insertedPoll.id);
      return NextResponse.json(
        { error: submissionInsertError.message || "Could not create moderation record." },
        { status: 500 }
      );
    }

    let emailSent = false;

    if (emailMeLink && email) {
      try {
        emailSent = await sendPollLinkEmail({
          to: email,
          question,
          pollUrl,
        });
      } catch {
        emailSent = false;
      }
    }

    return NextResponse.json({
      pollUrl,
      slug,
      shareText: makeShareText(question, pollUrl),
      emailSent,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}