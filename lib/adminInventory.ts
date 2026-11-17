import type { SupabaseClient } from "@supabase/supabase-js";

// Keyset pagination has no fixed total ceiling and also works when the server's
// per-request cap is lower than our requested page size. Never return partial data.
export async function fetchAllById<T extends { id: number }>(
  page: (afterId: number | null) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  let afterId: number | null = null;
  for (;;) {
    const { data, error } = await page(afterId);
    if (error) throw error;
    if (!data?.length) return rows;
    for (const row of data) {
      if (!Number.isSafeInteger(Number(row.id)) || (afterId !== null && Number(row.id) <= afterId)) {
        throw new Error("Admin pagination did not advance.");
      }
      afterId = Number(row.id);
      rows.push(row);
    }
  }
}

export type PollMeta = { id: number; slug: string | null; is_publicly_listed: boolean | null };
export type SubmissionMeta = { id: number; poll_id: number | null; status: string };

export function classifyAdminInventory(polls: PollMeta[], submissions: SubmissionMeta[]) {
  const listedIds = new Set(polls.filter(p => p.is_publicly_listed).map(p => Number(p.id)));
  const hiddenIds = new Set(submissions.filter(s => s.status === "hidden" && s.poll_id !== null).map(s => Number(s.poll_id)));
  const activeIds = new Set(submissions.filter(s => s.status !== "hidden" && s.poll_id !== null).map(s => Number(s.poll_id)));
  const isQueued = (s: Pick<SubmissionMeta, "status" | "poll_id">) =>
    s.status !== "hidden" && (s.poll_id === null || !listedIds.has(Number(s.poll_id)));
  const liveIds = new Set(polls.filter(p => !hiddenIds.has(Number(p.id)) &&
    (p.is_publicly_listed || !activeIds.has(Number(p.id)))).map(p => Number(p.id)));
  return { listedIds, liveIds, isQueued, submissionCount: submissions.filter(isQueued).length };
}

export async function loadAdminInventory(client: SupabaseClient) {
  const [polls, submissions] = await Promise.all([
    fetchAllById<PollMeta>(after => {
      let query = client.from("polls").select("id, slug, is_publicly_listed").order("id").limit(1000);
      if (after !== null) query = query.gt("id", after);
      return query;
    }),
    fetchAllById<SubmissionMeta>(after => {
      let query = client.from("poll_submissions").select("id, poll_id, status").order("id").limit(1000);
      if (after !== null) query = query.gt("id", after);
      return query;
    }),
  ]);
  return { polls, submissions, ...classifyAdminInventory(polls, submissions) };
}
