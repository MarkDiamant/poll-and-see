import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchAllById, loadAdminInventory } from "@/lib/adminInventory";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase admin environment variables are not configured.");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
function isAuthorized(request: NextRequest) {
  const expectedKey = process.env.POLL_ADMIN_KEY;
  const providedKey = request.headers.get("x-admin-key");
  if (!expectedKey) return { ok: false, error: "POLL_ADMIN_KEY is not configured." };
  if (!providedKey || providedKey !== expectedKey) return { ok: false, error: "Unauthorized." };
  return { ok: true };
}

export async function GET(request: NextRequest) {
  const auth = isAuthorized(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const supabaseAdmin = getAdminClient();
    const search = request.nextUrl.searchParams.get("q")?.trim() || "";
    const [inventory, pollsData] = await Promise.all([
      loadAdminInventory(supabaseAdmin),
      fetchAllById(after => {
        let query = supabaseAdmin.from("polls").select("id, question, description, category, region, slug, is_private, featured, embed_token, is_embeddable, embed_active, embed_voting_enabled, created_at, is_publicly_listed").order("id").limit(1000);
        if (after !== null) query = query.gt("id", after);
        if (search) {
          const safeSearch = search.replace(/[%(),]/g, " ");
          query = query.or(`question.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,slug.ilike.%${safeSearch}%`);
        }
        return query;
      }),
    ]);
    const basePolls = pollsData.filter(p => inventory.liveIds.has(Number(p.id)))
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
    const pollIds = basePolls.map((poll) => Number(poll.id));
    const optionRows: Array<{ id:number; poll_id:number; option_text:string; image_url:string|null; vote_count:number }> = [];
    // Bound the IN list as well as the result page size, avoiding oversized URLs.
    for (let offset = 0; offset < pollIds.length; offset += 200) {
      const batch = pollIds.slice(offset, offset + 200);
      const rows = await fetchAllById(after => {
        let query = supabaseAdmin.from("poll_options").select("id, poll_id, option_text, image_url, vote_count").in("poll_id", batch).order("id").limit(1000);
        if (after !== null) query = query.gt("id", after);
        return query;
      });
      optionRows.push(...rows);
    }
    const optionsByPoll = new Map<number, typeof optionRows>();
    optionRows.forEach((row) => { const existing = optionsByPoll.get(Number(row.poll_id)) || []; existing.push({ ...row, id:Number(row.id), poll_id:Number(row.poll_id), vote_count:Number(row.vote_count || 0) }); optionsByPoll.set(Number(row.poll_id), existing); });
    const polls = basePolls.map((poll) => ({ ...poll, options: optionsByPoll.get(Number(poll.id)) || [] }));
    return NextResponse.json({ polls, allSlugs: inventory.polls.filter(row => row.slug).map(row => ({ id: row.id, slug: row.slug as string })), pendingSubmissionsCount: inventory.submissionCount });
  } catch { return NextResponse.json({ error: "Could not load polls." }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const auth = isAuthorized(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const supabaseAdmin = getAdminClient();
    const body = await request.json();
    const { question, description, category, region = "Universal", is_private, options } = body;
    if (!question || !options || options.length < 2) return NextResponse.json({ error: "Invalid data." }, { status: 400 });
    const slug = question.toLowerCase().trim().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
    const { data: poll, error: pollError } = await supabaseAdmin.from("polls").insert({ question, description, category, region: ["UK", "US", "Universal"].includes(region) ? region : "Universal", is_private: Boolean(is_private), slug }).select().single();
    if (pollError || !poll) return NextResponse.json({ error: "Could not create poll." }, { status: 500 });
    const { error: optionError } = await supabaseAdmin.from("poll_options").insert(options.map((opt:string) => ({ poll_id: poll.id, option_text: opt })));
    if (optionError) return NextResponse.json({ error: "Options failed." }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Could not create poll." }, { status: 500 }); }
}
