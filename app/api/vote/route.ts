import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const POLL_COOLDOWN_HOURS = 24 * 365;
const BURST_WINDOW_SECONDS = 120;
const MAX_BURST_VOTES = 50;

function getIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server vote protection is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const pollId = Number(body.pollId);
    const optionId = Number(body.optionId);

    if (!Number.isInteger(pollId) || !Number.isInteger(optionId)) {
      return NextResponse.json(
        { error: "Invalid vote request." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: optionRow, error: optionError } = await supabaseAdmin
      .from("poll_options")
      .select("id, poll_id")
      .eq("id", optionId)
      .eq("poll_id", pollId)
      .limit(1)
      .maybeSingle();

    if (optionError) {
      return NextResponse.json(
        { error: "Could not validate vote option." },
        { status: 500 }
      );
    }

    if (!optionRow) {
      return NextResponse.json(
        { error: "That option is not valid for this poll." },
        { status: 400 }
      );
    }

    const ipAddress = getIpAddress(request);
    const ipHash = hashIp(ipAddress);

    const now = new Date();
    const pollCooldownCutoff = new Date(
      now.getTime() - POLL_COOLDOWN_HOURS * 60 * 60 * 1000
    ).toISOString();

    const burstCutoff = new Date(
      now.getTime() - BURST_WINDOW_SECONDS * 1000
    ).toISOString();

    const [samePollRecentVoteResult, burstVotesResult] = await Promise.all([
      supabaseAdmin
        .from("votes")
        .select("id")
        .eq("poll_id", pollId)
        .eq("ip_hash", ipHash)
        .gte("created_at", pollCooldownCutoff)
        .limit(1)
        .maybeSingle(),

      supabaseAdmin
        .from("votes")
        .select("id")
        .eq("ip_hash", ipHash)
        .gte("created_at", burstCutoff)
        .limit(MAX_BURST_VOTES),
    ]);

    if (samePollRecentVoteResult.error) {
      return NextResponse.json(
        { error: "Could not validate vote history." },
        { status: 500 }
      );
    }

    if (burstVotesResult.error) {
      return NextResponse.json(
        { error: "Could not validate vote rate." },
        { status: 500 }
      );
    }

    if (samePollRecentVoteResult.data) {
      return NextResponse.json(
        { error: "You’ve already voted on this poll." },
        { status: 429 }
      );
    }

    if ((burstVotesResult.data?.length || 0) >= MAX_BURST_VOTES) {
      return NextResponse.json(
        { error: "Too many votes too quickly. Please try again shortly." },
        { status: 429 }
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from("votes")
      .insert({
        poll_id: pollId,
        option_id: optionId,
        ip_hash: ipHash,
      });

    if (insertError) {
      return NextResponse.json(
        { error: "Could not save vote." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not submit vote." },
      { status: 500 }
    );
  }
}