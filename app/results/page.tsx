import Head from "next/head";
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import LiveVoteCounter from "@/components/LiveVoteCounter";

type Poll = {
  id: number;
  question: string;
  description: string | null;
  category: string;
  slug: string;
  is_private: boolean | null;
  is_publicly_listed: boolean | null;
  total_votes?: number | null;
};

type PollOption = {
  id: number;
  poll_id: number;
  option_text: string;
  vote_count: number;
  image_url?: string | null;
};

type VoteCounts = Record<number, number>;

type PollBundle = {
  poll: Poll;
  options: PollOption[];
  voteCounts: VoteCounts;
  selectedOptionId: number | null;
  votedAt: number;
};

const OPTION_COLOURS = ["#2563eb", "#22c55e", "#fbbf24", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#ef4444"];

const CATEGORY_COLOURS: Record<string, { text: string; bg: string; border: string; solid: string }> = {
  All: { text: "#e5e7eb", bg: "rgba(31, 41, 55, 0.9)", border: "rgba(75, 85, 99, 1)", solid: "#374151" },
  Business: { text: "#93c5fd", bg: "rgba(37, 99, 235, 0.12)", border: "rgba(37, 99, 235, 0.55)", solid: "#2563eb" },
  Community: { text: "#fca5a5", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.55)", solid: "#ef4444" },
  Education: { text: "#fde68a", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.55)", solid: "#f59e0b" },
  Finance: { text: "#86efac", bg: "rgba(34, 197, 94, 0.12)", border: "rgba(34, 197, 94, 0.55)", solid: "#22c55e" },
  Fun: { text: "#f9a8d4", bg: "rgba(236, 72, 153, 0.12)", border: "rgba(236, 72, 153, 0.55)", solid: "#ec4899" },
  General: { text: "#67e8f9", bg: "rgba(6, 182, 212, 0.12)", border: "rgba(6, 182, 212, 0.55)", solid: "#06b6d4" },
  Lifestyle: { text: "#d8b4fe", bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.55)", solid: "#a855f7" },
  Health: { text: "#fdba74", bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.55)", solid: "#f97316" },
  Politics: { text: "#fcd34d", bg: "rgba(234, 179, 8, 0.12)", border: "rgba(234, 179, 8, 0.55)", solid: "#eab308" },
  Sport: { text: "#c4b5fd", bg: "rgba(139, 92, 246, 0.12)", border: "rgba(139, 92, 246, 0.55)", solid: "#8b5cf6" },
  Sports: { text: "#c4b5fd", bg: "rgba(139, 92, 246, 0.12)", border: "rgba(139, 92, 246, 0.55)", solid: "#8b5cf6" },
  Tech: { text: "#f9a8d4", bg: "rgba(217, 70, 239, 0.12)", border: "rgba(217, 70, 239, 0.55)", solid: "#d946ef" },
};

const FALLBACK_CATEGORY_COLOURS = [
  { text: "#93c5fd", bg: "rgba(37, 99, 235, 0.12)", border: "rgba(37, 99, 235, 0.55)", solid: "#2563eb" },
  { text: "#fca5a5", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.55)", solid: "#ef4444" },
  { text: "#fde68a", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.55)", solid: "#f59e0b" },
  { text: "#86efac", bg: "rgba(34, 197, 94, 0.12)", border: "rgba(34, 197, 94, 0.55)", solid: "#22c55e" },
  { text: "#67e8f9", bg: "rgba(6, 182, 212, 0.12)", border: "rgba(6, 182, 212, 0.55)", solid: "#06b6d4" },
  { text: "#d8b4fe", bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.55)", solid: "#a855f7" },
  { text: "#fdba74", bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.55)", solid: "#f97316" },
  { text: "#fcd34d", bg: "rgba(234, 179, 8, 0.12)", border: "rgba(234, 179, 8, 0.55)", solid: "#eab308" },
  { text: "#c4b5fd", bg: "rgba(139, 92, 246, 0.12)", border: "rgba(139, 92, 246, 0.55)", solid: "#8b5cf6" },
  { text: "#f9a8d4", bg: "rgba(217, 70, 239, 0.12)", border: "rgba(217, 70, 239, 0.55)", solid: "#d946ef" },
];

function getCategoryColours(category: string) {
  const trimmed = category?.trim();
  if (!trimmed) return CATEGORY_COLOURS.All;
  if (CATEGORY_COLOURS[trimmed]) return CATEGORY_COLOURS[trimmed];

  let hash = 0;
  for (let i = 0; i < trimmed.length; i += 1) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
  }

  return FALLBACK_CATEGORY_COLOURS[Math.abs(hash) % FALLBACK_CATEGORY_COLOURS.length];
}

function ResultOptions({
  options,
  voteCounts,
  selectedOptionId,
}: {
  options: PollOption[];
  voteCounts: VoteCounts;
  selectedOptionId: number | null;
}) {
  const total = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-2">
      {options.map((option, index) => {
        const count = voteCounts[option.id] || 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        const colour = OPTION_COLOURS[index] || OPTION_COLOURS[0];
        const isSelected = selectedOptionId === option.id;

        return (
          <div
            key={option.id}
            className={option.image_url ? "rounded-xl md:max-w-[480px]" : "rounded-xl"}
            style={{
              border: isSelected ? `2px solid ${colour}cc` : "2px solid transparent",
              boxShadow: isSelected ? `0 0 8px ${colour}22` : "none",
            }}
          >
            <div className="px-3 pt-2">
              {option.image_url ? (
                <div className="mb-3 overflow-hidden rounded-xl bg-gray-900 md:max-w-[480px]">
                  <img
                    src={option.image_url}
                    alt={option.option_text}
                    loading="lazy"
                    width={1200}
                    height={675}
                    className="aspect-square h-auto w-full object-contain"
                  />
                </div>
              ) : null}

                            <div className="grid grid-cols-[1fr_auto] items-start gap-x-3">
                <div className="flex min-w-0 items-center gap-2">
                  {isSelected ? (
                    <span className="shrink-0 text-sm font-bold leading-5 sm:text-base" style={{ color: colour }}>
                      ✓
                    </span>
                  ) : null}
                  <span className="min-w-0 break-words text-sm leading-5 text-white sm:text-base">
                    {option.option_text}
                  </span>
                </div>
             <span className="shrink-0 whitespace-nowrap text-right text-sm font-semibold text-gray-300">
                  {percent}% <span className="font-normal text-gray-400">• {count} votes</span>
                </span>
              </div>
            </div>

            <div className="px-3 pb-2 pt-1">
              <div className="h-5 w-full overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-5 transition-all"
                  style={{ width: `${percent}%`, backgroundColor: colour, opacity: 0.96 }}
                />
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}

export default function ResultsPage() {
  const [votedPolls, setVotedPolls] = useState<PollBundle[]>([]);
  const [newPolls, setNewPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showTopButton, setShowTopButton] = useState(false);
const [totalVoteCount, setTotalVoteCount] = useState<number | null>(null);

  useEffect(() => {
    const loadResults = async () => {
  setLoading(true);

  try {
    const { data: statsRow } = await supabase
      .from("site_stats")
      .select("total_votes")
      .eq("key", "global")
      .single();

    setTotalVoteCount(statsRow?.total_votes ?? 0);

    const votedMeta: Array<{ pollId: number; selectedOptionId: number | null; votedAt: number }> = [];

        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i) || "";
          if (!key.startsWith("poll-voted-")) continue;
          if (localStorage.getItem(key) !== "true") continue;

          const pollId = Number(key.replace("poll-voted-", ""));
          if (Number.isNaN(pollId)) continue;

          const selectedRaw =
            localStorage.getItem(`poll-selected-${pollId}`) ||
            localStorage.getItem(`poll-selected-option-${pollId}`);
          const votedAtRaw = localStorage.getItem(`poll-voted-at-${pollId}`);

          votedMeta.push({
            pollId,
            selectedOptionId: selectedRaw ? Number(selectedRaw) : null,
            votedAt: votedAtRaw ? Number(votedAtRaw) : 0,
          });
        }

        const votedPollIds = votedMeta.map((item) => item.pollId);

        if (votedPollIds.length > 0) {
          const [{ data: pollRows }, { data: optionRows }] = await Promise.all([
               supabase
              .from("polls")
              .select("id, question, description, category, slug, is_private, is_publicly_listed, total_votes")
              .in("id", votedPollIds),
            supabase
              .from("poll_options")
              .select("id, poll_id, option_text, vote_count, image_url")
              .in("poll_id", votedPollIds)
              .order("id", { ascending: true }),
          ]);

          const pollMap = new Map<number, Poll>();
          (pollRows || []).forEach((poll) => {
            pollMap.set(poll.id, poll as Poll);
          });

          const optionsByPoll = new Map<number, PollOption[]>();
          (optionRows || []).forEach((option) => {
            const typed = option as PollOption;
            const existing = optionsByPoll.get(typed.poll_id) || [];
            existing.push(typed);
            optionsByPoll.set(typed.poll_id, existing);
          });

          const bundles: PollBundle[] = votedMeta
            .map((meta) => {
              const poll = pollMap.get(meta.pollId);
              if (!poll) return null;

              const options = optionsByPoll.get(meta.pollId) || [];
              const voteCounts: VoteCounts = {};
              options.forEach((option) => {
                voteCounts[option.id] = option.vote_count || 0;
              });

              return {
                poll,
                options,
                voteCounts,
                selectedOptionId: meta.selectedOptionId,
                votedAt: meta.votedAt,
              };
            })
            .filter((item): item is PollBundle => Boolean(item))
            .sort((a, b) => b.votedAt - a.votedAt);

          setVotedPolls(bundles);
        } else {
          setVotedPolls([]);
        }

          const { data: newPollRows } = await supabase
          .from("polls")
          .select("id, question, description, category, slug, is_private, is_publicly_listed, total_votes")
          .eq("is_private", false)
          .eq("is_publicly_listed", true)
          .order("id", { ascending: false })
          .limit(30);

        const votedSet = new Set(votedPollIds);
        setNewPolls(((newPollRows || []) as Poll[]).filter((poll) => !votedSet.has(poll.id)));
      } catch {
        setVotedPolls([]);
        setNewPolls([]);
      } finally {
        setLoading(false);
      }
    };

    void loadResults();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowTopButton(window.scrollY > 800);
    };

    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
  const channel = supabase
    .channel("results-live-votes")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "votes",
      },
      () => {
  setTotalVoteCount((prev) => (prev ?? 0) + 1);
}
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  const filteredVotedPolls = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return votedPolls;
    return votedPolls.filter((bundle) => bundle.poll.question.toLowerCase().includes(term));
  }, [searchTerm, votedPolls]);

  return (
  <>
    <Head>
      <link rel="canonical" href="https://www.pollandsee.com/" />
    </Head>
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-6 pt-2 pb-8">
       <div className="mb-5 text-center">
  <h1 className="mb-2 text-4xl font-bold md:text-5xl">Poll & See</h1>
  <p className="text-lg text-gray-300">See what people really think</p>
  {totalVoteCount !== null && (
  <LiveVoteCounter value={totalVoteCount} />
)}
</div>

<div className="mb-6 text-center">
  <h2 className="text-4xl font-bold md:text-5xl">Your results</h2>
  <p className="mt-2 text-lg text-gray-300">Polls you’ve voted on, with full results</p>
</div>

        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by question..."
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500"
          />
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 text-gray-300">
            Loading results...
          </div>
        ) : (
          <>
            <div className="space-y-5">
              {filteredVotedPolls.length > 0 ? (
                filteredVotedPolls.map((bundle) => (
                  <div
                    key={bundle.poll.id}
                    className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span
                        className="rounded-full px-2 py-1 text-xs"
                        style={{
                          color: getCategoryColours(bundle.poll.category).text,
                          backgroundColor: getCategoryColours(bundle.poll.category).bg,
                          border: `1px solid ${getCategoryColours(bundle.poll.category).border}`,
                        }}
                      >
                        {bundle.poll.category}
                      </span>

                      <span className="text-sm text-gray-400">
                        {Object.values(bundle.voteCounts).reduce((sum, count) => sum + count, 0)} votes
                      </span>
                    </div>

                    <h2 className="mb-2 text-2xl font-bold">{bundle.poll.question}</h2>
                    {bundle.poll.description ? (
                      <p className="mb-4 text-gray-300">{bundle.poll.description}</p>
                    ) : null}

                    <ResultOptions
                      options={bundle.options}
                      voteCounts={bundle.voteCounts}
                      selectedOptionId={bundle.selectedOptionId}
                    />
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 text-gray-300">
                  You haven’t voted on any polls yet.
                </div>
              )}
            </div>

            <div className="mt-10 mb-5">
              <h2 className="text-2xl font-semibold">New polls to vote on</h2>
            </div>

                       {newPolls.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {newPolls.map((poll) => (
                  <Link
                    key={poll.id}
                    href={`/poll/${poll.slug}`}
                   className="relative overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 p-4 shadow-lg transition hover:border-gray-500 flex min-h-[190px] flex-col justify-between"
                  >
                    <div className="mb-3 flex items-center">
                      <span
                        className="rounded-full px-2 py-1 text-xs"
                        style={{
                          color: getCategoryColours(poll.category).text,
                          backgroundColor: getCategoryColours(poll.category).bg,
                          border: `1px solid ${getCategoryColours(poll.category).border}`,
                        }}
                      >
                        {poll.category}
                      </span>
                    </div>

                    <div className="flex-1 py-2">
  <h4 className="text-left text-lg font-semibold">{poll.question}</h4>
</div>

<div className="flex items-center justify-end gap-1.5 text-sm text-gray-400">
                      <span>Vote now</span>
                      <span aria-hidden="true" className="text-base leading-none">
                        ›
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 text-center text-gray-300">
                You’ve voted on all live polls. Check back soon.
              </div>
            )}
          </>
        )}
      </section>

      <Footer />

      {showTopButton ? (
        <button
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
          className="fixed bottom-5 right-5 z-50 rounded-2xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-gray-700 md:bottom-6 md:right-8 md:px-5"
        >
          Back to top
        </button>
      ) : null}
    </main>
</>
  );
}