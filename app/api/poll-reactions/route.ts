import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ReactionType = "surprising" | "agree" | "funny";

const VALID_REACTIONS: ReactionType[] = ["surprising", "agree", "funny"];

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

function emptyCounts() {
  return {
    surprising: 0,
    agree: 0,
    funny: 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getAdminClient();
    const searchParams = request.nextUrl.searchParams;

    const pollIds = (searchParams.get("pollIds") || "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => !Number.isNaN(value));

    const browserId = (searchParams.get("browserId") || "").trim();

    if (pollIds.length === 0) {
      return NextResponse.json({
        counts: {},
        selected: {},
      });
    }

    const { data, error } = await supabaseAdmin
      .from("poll_reactions")
      .select("poll_id, browser_id, reaction_type")
      .in("poll_id", pollIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const counts: Record<number, Record<ReactionType, number>> = {};
    const selected: Record<number, ReactionType | null> = {};

    pollIds.forEach((pollId) => {
      counts[pollId] = emptyCounts();
      selected[pollId] = null;
    });

    (data || []).forEach((row) => {
      const pollId = Number(row.poll_id);
      const reactionType = row.reaction_type as ReactionType;

      if (!counts[pollId]) {
        counts[pollId] = emptyCounts();
      }

      if (VALID_REACTIONS.includes(reactionType)) {
        counts[pollId][reactionType] += 1;
      }

      if (browserId && row.browser_id === browserId && VALID_REACTIONS.includes(reactionType)) {
        selected[pollId] = reactionType;
      }
    });

    return NextResponse.json({
      counts,
      selected,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load reactions." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getAdminClient();
    const body = await request.json();

    const pollId = Number(body.pollId);
    const browserId = String(body.browserId || "").trim();
    const reactionType = String(body.reactionType || "").trim() as ReactionType;

    if (!pollId || Number.isNaN(pollId)) {
      return NextResponse.json({ error: "Poll ID is required." }, { status: 400 });
    }

    if (!browserId) {
      return NextResponse.json({ error: "Browser ID is required." }, { status: 400 });
    }

    if (!VALID_REACTIONS.includes(reactionType)) {
      return NextResponse.json({ error: "Invalid reaction." }, { status: 400 });
    }

    const { data: existingReaction, error: existingError } = await supabaseAdmin
      .from("poll_reactions")
      .select("id, reaction_type")
      .eq("poll_id", pollId)
      .eq("browser_id", browserId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existingReaction?.reaction_type === reactionType) {
      const { error: deleteError } = await supabaseAdmin
        .from("poll_reactions")
        .delete()
        .eq("id", existingReaction.id);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    } else if (existingReaction) {
      const { error: updateError } = await supabaseAdmin
        .from("poll_reactions")
        .update({
          reaction_type: reactionType,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingReaction.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabaseAdmin.from("poll_reactions").insert({
        poll_id: pollId,
        browser_id: browserId,
        reaction_type: reactionType,
      });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const { data: rows, error: countError } = await supabaseAdmin
      .from("poll_reactions")
      .select("browser_id, reaction_type")
      .eq("poll_id", pollId);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const counts = emptyCounts();
    let selected: ReactionType | null = null;

    (rows || []).forEach((row) => {
      const rowReactionType = row.reaction_type as ReactionType;

      if (VALID_REACTIONS.includes(rowReactionType)) {
        counts[rowReactionType] += 1;
      }

      if (row.browser_id === browserId && VALID_REACTIONS.includes(rowReactionType)) {
        selected = rowReactionType;
      }
    });

    return NextResponse.json({
      pollId,
      counts,
      selected,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save reaction." },
      { status: 500 }
    );
  }
}