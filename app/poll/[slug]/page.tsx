"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Poll = {
  id: number;
  question: string;
  description: string;
  category: string;
  slug: string;
};

type PollOption = {
  id: number;
  poll_id: number;
  option_text: string;
};

type VoteCounts = Record<number, number>;

type PollBundle = {
  poll: Poll;
  options: PollOption[];
  voteCounts: VoteCounts;
};

const OPTION_COLOURS = ["#2563eb", "#22c55e", "#fbbf24", "#ec4899"];
const SAME_POLL_CLICK_GUARD_MS = 400;
const POLL_BUNDLE_CACHE_PREFIX = "poll-bundle-cache:";

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
  for (let i = 0; i < trimmed.length; i += 1) hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
  return FALLBACK_CATEGORY_COLOURS[Math.abs(hash) % FALLBACK_CATEGORY_COLOURS.length];
}

function canVoteNow(pollId: number): string | null {
  const last = Number(localStorage.getItem(`poll-last-click-${pollId}`) || 0);
  if (Date.now() - last < SAME_POLL_CLICK_GUARD_MS) return "Please try again.";
  return null;
}

function recordVoteClient(pollId: number) {
  localStorage.setItem(`poll-last-click-${pollId}`, String(Date.now()));
}

function getPollVotedKey(pollId: number) {
  return `poll-voted-${pollId}`;
}

function getPollSelectedOldKey(pollId: number) {
  return `poll-selected-option-${pollId}`;
}

function getPollSelectedNewKey(pollId: number) {
  return `poll-selected-${pollId}`;
}

function hasLocalVote(pollId: number): boolean {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem(getPollVotedKey(pollId)) === "true" ||
    localStorage.getItem(getPollSelectedOldKey(pollId)) !== null ||
    localStorage.getItem(getPollSelectedNewKey(pollId)) !== null
  );
}

function getLocalSelectedOption(pollId: number): number | null {
  if (typeof window === "undefined") return null;
  const raw =
    localStorage.getItem(getPollSelectedNewKey(pollId)) ||
    localStorage.getItem(getPollSelectedOldKey(pollId));
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

function markPollVotedLocally(pollId: number, optionId: number | null) {
  localStorage.setItem(getPollVotedKey(pollId), "true");
  if (optionId !== null) {
    localStorage.setItem(getPollSelectedNewKey(pollId), String(optionId));
    localStorage.setItem(getPollSelectedOldKey(pollId), String(optionId));
  }
}

function getCachedPollBundle(slug: string): PollBundle | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(`${POLL_BUNDLE_CACHE_PREFIX}${slug}`);
    if (!raw) return null;
    return JSON.parse(raw) as PollBundle;
  } catch {
    return null;
  }
}

function setCachedPollBundle(bundle: PollBundle) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(`${POLL_BUNDLE_CACHE_PREFIX}${bundle.poll.slug}`, JSON.stringify(bundle));
  } catch {
    // ignore cache failures
  }
}

async function submitVote(pollId: number, optionId: number) {
  const response = await fetch("/api/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pollId, optionId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Vote failed");
  }
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
    <div className="space-y-4">
      {options.map((option, index) => {
        const count = voteCounts[option.id] || 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        const colour = OPTION_COLOURS[index] || OPTION_COLOURS[0];
        const isSelected = selectedOptionId === option.id;

        return (
          <div
            key={option.id}
            className="rounded-xl"
            style={{
              border: isSelected ? `3px solid ${colour}` : "3px solid transparent",
              boxShadow: isSelected ? `0 0 0 1px ${colour}33, 0 0 16px ${colour}18` : "none",
            }}
          >
            <div className="px-3 pt-3">
              <div className="grid grid-cols-[1fr_auto] items-start gap-x-3">
                <div className="flex min-w-0 items-start gap-2">
                  {isSelected ? (
                    <span className="mt-0.5 shrink-0 text-base font-bold" style={{ color: colour }}>
                      ✓
                    </span>
                  ) : null}
                  <span className="min-w-0 break-words leading-6 text-white">{option.option_text}</span>
                </div>
                <span className="shrink-0 whitespace-nowrap text-right text-sm font-semibold text-gray-300">
                  {percent}%
                </span>
              </div>
            </div>

            <div className="px-3 pb-3 pt-2">
              <div className="h-4 w-full overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-4 transition-all"
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

function PollCard({
  bundle,
  showGoToAllPolls,
  onVoteComplete,
}: {
  bundle: PollBundle;
  showGoToAllPolls: boolean;
  onVoteComplete: (pollId: number, category: string) => void;
}) {
  const [voted, setVoted] = useState<boolean>(false);
  const [counts, setCounts] = useState<VoteCounts>(bundle.voteCounts);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [shareText, setShareText] = useState("Share poll");

  const totalVotes = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const categoryColours = getCategoryColours(bundle.poll.category);

  useEffect(() => {
    setVoted(hasLocalVote(bundle.poll.id));
    setSelected(getLocalSelectedOption(bundle.poll.id));
    setCounts(bundle.voteCounts);
    setError("");
    setShareText("Share poll");
  }, [bundle]);

  const handleShare = async () => {
    const url = `${window.location.origin}/poll/${bundle.poll.slug}`;
    const shareTextOnly = `${bundle.poll.question}\n\nVote and see what others think:`;
    const copiedShareText = `${bundle.poll.question}\n\nVote and see what others think:\n\n${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          text: shareTextOnly,
          url,
        });
        return;
      } catch {
        // fall through
      }
    }

    try {
      await navigator.clipboard.writeText(copiedShareText);
      setShareText("Link copied");
      setTimeout(() => setShareText("Share poll"), 2000);
    } catch {
      setShareText("Could not copy");
      setTimeout(() => setShareText("Share poll"), 2000);
    }
  };

  const handleVote = async (optionId: number) => {
    if (voted) return;

    const cooldownError = canVoteNow(bundle.poll.id);
    if (cooldownError) {
      setError(cooldownError);
      return;
    }

    setError("");

    const previousCounts = counts;
    const previousSelected = selected;
    const previousVoted = voted;

    setVoted(true);
    setSelected(optionId);
    setCounts((current) => ({
      ...current,
      [optionId]: (current[optionId] || 0) + 1,
    }));

    try {
      await submitVote(bundle.poll.id, optionId);
      markPollVotedLocally(bundle.poll.id, optionId);
      recordVoteClient(bundle.poll.id);
      onVoteComplete(bundle.poll.id, bundle.poll.category);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit vote.";
      const lower = message.toLowerCase();

      if (lower.includes("already voted")) {
        markPollVotedLocally(bundle.poll.id, optionId);
        setError("");
        setVoted(true);
        setSelected(optionId);
        onVoteComplete(bundle.poll.id, bundle.poll.category);
        return;
      }

      setCounts(previousCounts);
      setSelected(previousSelected);
      setVoted(previousVoted);
      setError(message);
    }
  };

  return (
    <div className="mb-8 rounded-2xl border border-gray-700 bg-gray-800 p-6">
      <div className="mb-4 flex items-center justify-between">
        <span
          className="rounded-full px-3 py-1 text-xs"
          style={{
            color: categoryColours.text,
            backgroundColor: categoryColours.bg,
            border: `1px solid ${categoryColours.border}`,
          }}
        >
          {bundle.poll.category}
        </span>

        <span className="text-sm text-gray-400">{totalVotes} votes</span>
      </div>

      <h2 className="mb-3 text-2xl font-bold">{bundle.poll.question}</h2>
      <p className="mb-6 text-gray-300">{bundle.poll.description}</p>

      {!voted ? (
        <div className="flex flex-col gap-3">
          {bundle.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              className="rounded-xl bg-gray-700 py-3 text-white transition hover:bg-gray-600"
            >
              {option.option_text}
            </button>
          ))}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
      ) : (
        <>
          <ResultOptions options={bundle.options} voteCounts={counts} selectedOptionId={selected} />
          <p className="pt-4 text-sm text-gray-400">You’ve voted.</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleShare}
              className="rounded-xl bg-white px-4 py-2 font-medium text-black transition hover:bg-gray-200"
            >
              {shareText}
            </button>

            <Link
              href={`/?category=${encodeURIComponent(bundle.poll.category)}#live-polls`}
              className="inline-flex items-center rounded-xl border px-4 py-2 font-medium transition hover:bg-gray-800"
              style={{
                borderColor: categoryColours.border,
                backgroundColor: categoryColours.bg,
                color: categoryColours.text,
              }}
            >
              See other {bundle.poll.category} polls
            </Link>

            {showGoToAllPolls ? (
              <Link
                href="/#live-polls"
                className="inline-flex items-center rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 font-medium text-white transition hover:bg-gray-800"
              >
                Go to all polls
              </Link>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export default function PollPage() {
  const params = useParams();
  const slug = String(params.slug);

  const [polls, setPolls] = useState<PollBundle[]>([]);
  const pollRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const previousPollCountRef = useRef(0);
  const preloadedQueueRef = useRef<PollBundle[]>([]);
  const pollsRef = useRef<PollBundle[]>([]);

  useEffect(() => {
    pollsRef.current = polls;
  }, [polls]);

  const loadBundle = async (pollId: number): Promise<PollBundle> => {
    const { data: pollData } = await supabase.from("polls").select("*").eq("id", pollId).single();

    const { data: optionsData } = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", pollId)
      .order("id", { ascending: true });

    const { data: votesData } = await supabase
      .from("votes")
      .select("option_id")
      .eq("poll_id", pollId);

    const counts: VoteCounts = {};
    (votesData || []).forEach((vote: { option_id: number }) => {
      counts[vote.option_id] = (counts[vote.option_id] || 0) + 1;
    });

    const bundle = {
      poll: pollData as Poll,
      options: (optionsData || []) as PollOption[],
      voteCounts: counts,
    };

    setCachedPollBundle(bundle);
    return bundle;
  };

  const preloadQueue = async (excludeIds: number[], preferredCategory: string) => {
    const { data } = await supabase.from("polls").select("*").order("id", { ascending: false });

    const pollList = (data || []) as Poll[];
    const unseen = pollList.filter((poll) => !excludeIds.includes(poll.id) && !hasLocalVote(poll.id));

    const sameCategory = unseen.filter((poll) => poll.category === preferredCategory);
    const otherCategories = unseen.filter((poll) => poll.category !== preferredCategory);
    const ordered = [...sameCategory, ...otherCategories];

    const bundles = await Promise.all(ordered.map((poll) => loadBundle(poll.id)));
    preloadedQueueRef.current = bundles;
  };

  useEffect(() => {
    const init = async () => {
      const cached = getCachedPollBundle(slug);
      if (cached) {
        setPolls([cached]);
      }

      const { data } = await supabase.from("polls").select("*").eq("slug", slug).single();
      if (!data) return;

      const firstBundle = await loadBundle(data.id);
      setPolls([firstBundle]);

      void preloadQueue([firstBundle.poll.id], firstBundle.poll.category);
    };

    void init();
  }, [slug]);

  useEffect(() => {
    if (polls.length > previousPollCountRef.current && polls.length > 1) {
      const lastPollId = polls[polls.length - 1]?.poll.id;
      if (lastPollId) {
        requestAnimationFrame(() => {
          pollRefs.current[lastPollId]?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }

    previousPollCountRef.current = polls.length;
  }, [polls]);

  const handleVoteComplete = async (pollId: number, category: string) => {
    const currentShownIds = pollsRef.current.map((item) => item.poll.id);

    while (preloadedQueueRef.current.length > 0) {
      const next = preloadedQueueRef.current.shift();
      if (!next) break;
      if (currentShownIds.includes(next.poll.id)) continue;
      if (hasLocalVote(next.poll.id)) continue;

      setPolls((current) => {
        if (current.some((item) => item.poll.id === next.poll.id)) return current;
        return [...current, next];
      });

      return;
    }

    await preloadQueue([...currentShownIds, pollId], category);

    while (preloadedQueueRef.current.length > 0) {
      const next = preloadedQueueRef.current.shift();
      if (!next) break;
      if (currentShownIds.includes(next.poll.id)) continue;
      if (hasLocalVote(next.poll.id)) continue;

      setPolls((current) => {
        if (current.some((item) => item.poll.id === next.poll.id)) return current;
        return [...current, next];
      });

      return;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <header className="max-w-6xl mx-auto px-4 md:px-6 pt-5 pb-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Go to homepage" className="shrink-0">
            <img
              src="/logo.png"
              alt="Poll & See"
              className="h-12 md:h-16 w-auto object-contain block"
            />
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border border-gray-700 bg-gray-900 px-3 md:px-5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Home
            </Link>

            <Link
              href="/submit-poll"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-blue-600 px-3 md:px-5 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Create Poll
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-2 pb-8">
      <button
  type="button"
  onClick={() => window.history.back()}
  className="text-sm text-blue-300"
>
  ← Back to polls
</button>

        {polls.map((bundle) => (
          <div
            key={bundle.poll.id}
            ref={(el) => {
              pollRefs.current[bundle.poll.id] = el;
            }}
          >
            <PollCard
              bundle={bundle}
              showGoToAllPolls={true}
              onVoteComplete={(pollId, category) => {
                void handleVoteComplete(pollId, category);
              }}
            />
          </div>
        ))}

        {polls.length > 1 ? (
          <div className="mt-6 text-center">
            <Link
              href="/submit-poll"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-500"
            >
              Create your own poll
            </Link>
          </div>
        ) : null}
      </section>

      <footer className="py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Poll & See
      </footer>
    </main>
  );
}