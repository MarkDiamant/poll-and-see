import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MILESTONES = [50, 250, 1000] as const;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin environment variables are not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function emailCopy(milestone: number) {
  if (milestone === 50) return {
    subject: "Your poll is gaining traction 🎉",
    heading: "Your poll is gaining traction!",
    body: "It’s already hit 50 votes. Share it to get even more results, and submit another poll to see how far that one can go."
  };
  if (milestone === 250) return {
    subject: "Your poll has passed 250 votes 🚀",
    heading: "Your poll is really taking off!",
    body: "It’s already passed 250 votes. Keep sharing it, and if you’ve got another question people will want to answer, put it out there."
  };
  return {
    subject: "Wow! Your poll has hit 1,000 votes 🎉",
    heading: "Wow. 1,000 votes!",
    body: "Your poll has now had over 1,000 votes. Keep it going by sharing it, and submit your next poll to see if you can do it again."
  };
}

function buildEmail(params: { milestone: number; pollUrl: string; appBaseUrl: string }) {
  const copy = emailCopy(params.milestone);
  const logoUrl = `${params.appBaseUrl}/logo.png`;
  const submitUrl = `${params.appBaseUrl}/submit-poll`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#020617;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#020617;"><tr><td align="center" style="padding:28px 14px 36px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;"><tr><td align="center" style="padding-bottom:24px;"><a href="${params.appBaseUrl}" target="_blank" style="display:inline-block;"><img src="${logoUrl}" alt="Poll & See" width="180" style="display:block;width:180px;max-width:100%;height:auto;border:0;" /></a></td></tr><tr><td style="background:#111827;border:1px solid #1f2937;border-radius:24px;padding:28px 22px;font-family:Arial,sans-serif;color:#ffffff;"><p style="margin:0 0 18px;font-size:16px;line-height:24px;color:#e5e7eb;">Hi,</p><p style="margin:0 0 12px;font-size:22px;line-height:30px;font-weight:700;color:#ffffff;">${escapeHtml(copy.heading)}</p><p style="margin:0 0 24px;font-size:16px;line-height:24px;color:#d1d5db;">${escapeHtml(copy.body)}</p><table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px;"><tr><td style="background:#06b6d4;border-radius:10px;"><a href="${escapeHtml(params.pollUrl)}" style="display:inline-block;padding:12px 18px;color:#001018;text-decoration:none;font-family:Arial,sans-serif;font-size:15px;font-weight:700;">Share your poll</a></td></tr></table><table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="border:1px solid #374151;border-radius:10px;"><a href="${submitUrl}" style="display:inline-block;padding:12px 18px;color:#67e8f9;text-decoration:none;font-family:Arial,sans-serif;font-size:15px;font-weight:700;">Submit another poll</a></td></tr></table><p style="margin:0;font-size:16px;line-height:24px;color:#e5e7eb;">Best,<br /><a href="${params.appBaseUrl}" style="color:#e5e7eb;text-decoration:none;">Poll & See</a><br /><span style="color:#9ca3af;">See what people really think</span></p></td></tr></table></td></tr></table></body></html>`;
  const text = `Hi,\n\n${copy.heading}\n\n${copy.body}\n\nShare your poll:\n${params.pollUrl}\n\nSubmit another poll:\n${submitUrl}\n\nBest,\nPoll & See\nSee what people really think`;
  return { ...copy, html, text };
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const appBaseUrl = process.env.APP_BASE_URL || "https://www.pollandsee.com";
  if (!resendApiKey || !emailFrom) return NextResponse.json({ error: "Email is not configured." }, { status: 500 });

  const supabase = getAdminClient();
  const { data: submissions, error } = await supabase
    .from("poll_submissions")
    .select("poll_id,email")
    .not("poll_id", "is", null)
    .not("email", "is", null);
  if (error) return NextResponse.json({ error: "Could not load poll submitters." }, { status: 500 });

  const submitterByPoll = new Map<number, string>();
  for (const row of submissions || []) {
    const email = typeof row.email === "string" ? row.email.trim() : "";
    if (row.poll_id && email) submitterByPoll.set(row.poll_id, email);
  }
  const pollIds = [...submitterByPoll.keys()];
  if (!pollIds.length) return NextResponse.json({ ok: true, sent: [] });

  const { data: polls, error: pollsError } = await supabase.from("polls").select("id,slug,total_votes,is_private").in("id", pollIds);
  if (pollsError) return NextResponse.json({ error: "Could not load poll totals." }, { status: 500 });
  const { data: sentRows } = await supabase.from("poll_milestone_emails").select("poll_id,milestone").in("poll_id", pollIds);
  const alreadySent = new Set((sentRows || []).map((r) => `${r.poll_id}:${r.milestone}`));
  const sent: Array<{ pollId: number; milestone: number }> = [];

  for (const poll of polls || []) {
    const votes = Number(poll.total_votes || 0);
    const email = submitterByPoll.get(poll.id);
    if (!email || poll.is_private) continue;

    const reached = [...MILESTONES].reverse().find((milestone) => votes >= milestone);
    if (!reached) continue;

    const hasReachedOrHigherEmail = MILESTONES.some(
      (milestone) => milestone >= reached && alreadySent.has(`${poll.id}:${milestone}`)
    );
    if (hasReachedOrHigherEmail || alreadySent.has(`${poll.id}:${reached}`)) continue;

    const pollUrl = `${appBaseUrl}/poll/${poll.slug}`;
    const content = buildEmail({ milestone: reached, pollUrl, appBaseUrl });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: emailFrom, to: email, subject: content.subject, html: content.html, text: content.text })
    });
    if (!response.ok) {
      console.error("Milestone email failed", poll.id, reached, await response.text());
      continue;
    }
    const responseData = await response.json().catch(() => ({}));
    const { error: insertError } = await supabase.from("poll_milestone_emails").insert({
      poll_id: poll.id,
      milestone: reached,
      email,
      resend_id: responseData?.id || null
    });
    if (!insertError) {
      alreadySent.add(`${poll.id}:${reached}`);
      sent.push({ pollId: poll.id, milestone: reached });
    }
  }
  return NextResponse.json({ ok: true, sent });
}
