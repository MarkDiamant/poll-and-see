"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

const CATEGORY_COLOURS: Record<string, { text: string; bg: string; border: string; solid: string }> = {
  All: {
    text: "#e5e7eb",
    bg: "rgba(31, 41, 55, 0.9)",
    border: "rgba(75, 85, 99, 1)",
    solid: "#374151",
  },
  Business: {
    text: "#93c5fd",
    bg: "rgba(37, 99, 235, 0.12)",
    border: "rgba(37, 99, 235, 0.55)",
    solid: "#2563eb",
  },
  Community: {
    text: "#fca5a5",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.55)",
    solid: "#ef4444",
  },
  Education: {
    text: "#fde68a",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.55)",
    solid: "#f59e0b",
  },
  Finance: {
    text: "#86efac",
    bg: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.55)",
    solid: "#22c55e",
  },
  Fun: {
    text: "#f9a8d4",
    bg: "rgba(236, 72, 153, 0.12)",
    border: "rgba(236, 72, 153, 0.55)",
    solid: "#ec4899",
  },
  General: {
    text: "#67e8f9",
    bg: "rgba(6, 182, 212, 0.12)",
    border: "rgba(6, 182, 212, 0.55)",
    solid: "#06b6d4",
  },
  Lifestyle: {
    text: "#d8b4fe",
    bg: "rgba(168, 85, 247, 0.12)",
    border: "rgba(168, 85, 247, 0.55)",
    solid: "#a855f7",
  },
  Health: {
    text: "#fdba74",
    bg: "rgba(249, 115, 22, 0.12)",
    border: "rgba(249, 115, 22, 0.55)",
    solid: "#f97316",
  },
  Politics: {
    text: "#fcd34d",
    bg: "rgba(234, 179, 8, 0.12)",
    border: "rgba(234, 179, 8, 0.55)",
    solid: "#eab308",
  },
  Sport: {
    text: "#c4b5fd",
    bg: "rgba(139, 92, 246, 0.12)",
    border: "rgba(139, 92, 246, 0.55)",
    solid: "#8b5cf6",
  },
  Sports: {
    text: "#c4b5fd",
    bg: "rgba(139, 92, 246, 0.12)",
    border: "rgba(139, 92, 246, 0.55)",
    solid: "#8b5cf6",
  },
  Tech: {
    text: "#f9a8d4",
    bg: "rgba(217, 70, 239, 0.12)",
    border: "rgba(217, 70, 239, 0.55)",
    solid: "#d946ef",
  },
};

const FALLBACK_CATEGORY_COLOURS = [
  {
    text: "#93c5fd",
    bg: "rgba(37, 99, 235, 0.12)",
    border: "rgba(37, 99, 235, 0.55)",
    solid: "#2563eb",
  },
  {
    text: "#fca5a5",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.55)",
    solid: "#ef4444",
  },
  {
    text: "#fde68a",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.55)",
    solid: "#f59e0b",
  },
  {
    text: "#86efac",
    bg: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.55)",
    solid: "#22c55e",
  },
  {
    text: "#67e8f9",
    bg: "rgba(6, 182, 212, 0.12)",
    border: "rgba(6, 182, 212, 0.55)",
    solid: "#06b6d4",
  },
  {
    text: "#d8b4fe",
    bg: "rgba(168, 85, 247, 0.12)",
    border: "rgba(168, 85, 247, 0.55)",
    solid: "#a855f7",
  },
  {
    text: "#fdba74",
    bg: "rgba(249, 115, 22, 0.12)",
    border: "rgba(249, 115, 22, 0.55)",
    solid: "#f97316",
  },
  {
    text: "#fcd34d",
    bg: "rgba(234, 179, 8, 0.12)",
    border: "rgba(234, 179, 8, 0.55)",
    solid: "#eab308",
  },
  {
    text: "#c4b5fd",
    bg: "rgba(139, 92, 246, 0.12)",
    border: "rgba(139, 92, 246, 0.55)",
    solid: "#8b5cf6",
  },
  {
    text: "#f9a8d4",
    bg: "rgba(217, 70, 239, 0.12)",
    border: "rgba(217, 70, 239, 0.55)",
    solid: "#d946ef",
  },
];

const CLIENT_GLOBAL_COOLDOWN_MS = 4000;
const CLIENT_BURST_WINDOW_MS = 120000;
const CLIENT_MAX_BURST_VOTES = 8;
const CLIENT_VOTE_TIMESTAMPS_KEY = "poll-vote-timestamps";
const CLIENT_LAST_VOTE_AT_KEY = "poll-last-vote-at";

const getOptionColour = (index: number) => {
  return OPTION_COLOURS[index] || OPTION_COLOURS[OPTION_COLOURS.length - 1];
};

const getCategoryColours = (category: string) => {
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
};

function getClientVoteTimestamps() {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(CLIENT_VOTE_TIMESTAMPS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value): value is number => typeof value === "number");
  } catch {
    return [];
  }
}

function setClientVoteTimestamps(timestamps: number[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLIENT_VOTE_TIMESTAMPS_KEY, JSON.stringify(timestamps));
}

function validateClientVoteThrottle() {
  if (typeof window === "undefined") {
    return { ok: true as const };
  }

  const now = Date.now();
  const lastVoteAtRaw = localStorage.getItem(CLIENT_LAST_VOTE_AT_KEY);
  const lastVoteAt = lastVoteAtRaw ? Number(lastVoteAtRaw) : 0;

  if (lastVoteAt && now - lastVoteAt < CLIENT_GLOBAL_COOLDOWN_MS) {
    return {
      ok: false as const,
      error: "Please wait a few seconds before voting again.",
    };
  }

  const recentTimestamps = getClientVoteTimestamps().filter(
    (timestamp) => now - timestamp <= CLIENT_BURST_WINDOW_MS
  );

  if (recentTimestamps.length >= CLIENT_MAX_BURST_VOTES) {
    setClientVoteTimestamps(recentTimestamps);
    return {
      ok: false as const,
      error: "Too many votes too quickly. Please try again shortly.",
    };
  }

  setClientVoteTimestamps(recentTimestamps);
  return { ok: true as const };
}

function recordClientVote() {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const recentTimestamps = getClientVoteTimestamps().filter(
    (timestamp) => now - timestamp <= CLIENT_BURST_WINDOW_MS
  );

  recentTimestamps.push(now);

  localStorage.setItem(CLIENT_LAST_VOTE_AT_KEY, String(now));
  setClientVoteTimestamps(recentTimestamps);
}

async function submitVote(pollId: number, optionId: number) {
  const response = await fetch("/api/vote", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pollId,
      optionId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not submit vote.");
  }

  return data;
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
  const [wrappedOptionIds, setWrappedOptionIds] = useState<Record<number, boolean>>({});
  const optionTextRefs = useRef<Record<number, HTMLSpanElement | null>>({});

  const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);

  useLayoutEffect(() => {
    if (options.length === 0) return;

    const measureWrappedOptions = () => {
      const nextWrapped: Record<number, boolean> = {};

      options.forEach((option) => {
        const el = optionTextRefs.current[option.id];
        if (!el) {
          nextWrapped[option.id] = false;
          return;
        }

        const computedStyle = window.getComputedStyle(el);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const height = el.getBoundingClientRect().height;

        nextWrapped[option.id] = lineHeight > 0 ? height > lineHeight * 1.5 : false;
      });

      setWrappedOptionIds(nextWrapped);
    };

    measureWrappedOptions();

    const resizeObserver = new ResizeObserver(() => {
      measureWrappedOptions();
    });

    options.forEach((option) => {
      const el = optionTextRefs.current[option.id];
      if (el) {
        resizeObserver.observe(el);
      }
    });

    window.addEventListener("resize", measureWrappedOptions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureWrappedOptions);
    };
  }, [options]);

  return (
    <div className="space-y-4">
      {options.map((option, index) => {
        const count = voteCounts[option.id] || 0;
        const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const isSelected = selectedOptionId === option.id;
        const optionColour = getOptionColour(index);
        const isWrapped = wrappedOptionIds[option.id] === true;

        return (
          <div
            key={option.id}
            className="rounded-2xl"
            style={{
              border: isSelected ? `3px solid ${optionColour}` : "3px solid transparent",
              boxShadow: isSelected
                ? `0 0 0 1px ${optionColour}33, 0 0 16px ${optionColour}18`
                : "none",
            }}
          >
            <div className="px-3 pt-3">
              {!isWrapped ? (
                <div className="grid grid-cols-[1fr_auto] items-start gap-x-3">
                  <div className="flex items-start gap-2 min-w-0">
                    {isSelected ? (
                      <span
                        className="mt-0.5 shrink-0 text-base font-bold"
                        style={{ color: optionColour }}
                      >
                        ✓
                      </span>
                    ) : null}

                    <span
                      ref={(el) => {
                        optionTextRefs.current[option.id] = el;
                      }}
                      className="min-w-0 leading-6 break-words text-white"
                    >
                      {option.option_text}
                    </span>
                  </div>

                  <span className="shrink-0 whitespace-nowrap text-right text-sm font-semibold text-gray-300">
                    {percent}%
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-2 min-w-0">
                    {isSelected ? (
                      <span
                        className="mt-0.5 shrink-0 text-base font-bold"
                        style={{ color: optionColour }}
                      >
                        ✓
                      </span>
                    ) : null}

                    <span
                      ref={(el) => {
                        optionTextRefs.current[option.id] = el;
                      }}
                      className="min-w-0 leading-6 break-words text-white"
                    >
                      {option.option_text}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-end">
                    <span className="shrink-0 whitespace-nowrap text-right text-sm font-semibold text-gray-300">
                      {percent}%
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="px-3 pb-3 pt-2">
              <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className="h-4 transition-all"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: optionColour,
                    opacity: 0.96,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InlineNextPoll({
  bundle,
}: {
  bundle: PollBundle;
}) {
  const [voteCounts, setVoteCounts] = useState<VoteCounts>(bundle.voteCounts);
  const [voted, setVoted] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");

  const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
  const categoryColours = getCategoryColours(bundle.poll.category);

  useEffect(() => {
    const savedVote = localStorage.getItem(`poll-voted-${bundle.poll.id}`);
    const savedSelectedOption = localStorage.getItem(`poll-selected-option-${bundle.poll.id}`);

    setVoted(savedVote === "true");

    if (savedSelectedOption) {
      const parsed = parseInt(savedSelectedOption, 10);
      setSelectedOptionId(Number.isNaN(parsed) ? null : parsed);
    } else {
      setSelectedOptionId(null);
    }
  }, [bundle.poll.id]);

  useEffect(() => {
    setVoteCounts(bundle.voteCounts);
  }, [bundle.voteCounts]);

  const handleVote = async (optionId: number) => {
    if (voted || submitting) return;

    const throttleCheck = validateClientVoteThrottle();
    if (!throttleCheck.ok) {
      setErrorText(throttleCheck.error);
      return;
    }

    setSubmitting(true);
    setErrorText("");

    try {
      await submitVote(bundle.poll.id, optionId);

      setVoteCounts((prev) => ({
        ...prev,
        [optionId]: (prev[optionId] || 0) + 1,
      }));

      recordClientVote();
      localStorage.setItem(`poll-voted-${bundle.poll.id}`, "true");
      localStorage.setItem(`poll-selected-option-${bundle.poll.id}`, String(optionId));
      setSelectedOptionId(optionId);
      setVoted(true);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Could not submit vote.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-xs px-3 py-1 rounded-full"
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

      <h2 className="text-2xl font-bold mb-4">{bundle.poll.question}</h2>
      <p className="text-gray-300 mb-8">{bundle.poll.description}</p>

      {!voted ? (
        <>
          <div className="flex flex-col gap-4">
            {bundle.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={submitting}
                className="py-3 rounded-xl font-medium text-white transition bg-gray-700 hover:bg-gray-600 disabled:opacity-70"
              >
                {submitting ? "Submitting..." : option.option_text}
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm text-gray-400">Vote to see results</p>

          {errorText ? (
            <p className="mt-3 text-sm text-red-300">{errorText}</p>
          ) : null}
        </>
      ) : (
        <>
          <ResultOptions
            options={bundle.options}
            voteCounts={voteCounts}
            selectedOptionId={selectedOptionId}
          />
          <p className="text-sm text-gray-400 pt-4">You’ve voted.</p>
        </>
      )}

      <div className="mt-8 border-t border-gray-700 pt-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/poll/${bundle.poll.slug}`}
            className="inline-flex items-center rounded-xl bg-white px-4 py-2 font-medium text-black transition hover:bg-gray-200"
          >
            Open full poll
          </Link>

          <Link
            href={`/?category=${encodeURIComponent(bundle.poll.category)}#live-polls`}
            className="inline-flex items-center rounded-xl border px-4 py-2 font-medium text-white transition hover:bg-gray-800"
            style={{
              borderColor: categoryColours.border,
              backgroundColor: categoryColours.bg,
              color: categoryColours.text,
            }}
          >
            See other {bundle.poll.category} polls
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PollPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params.slug);

  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({});
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shareText, setShareText] = useState("Share poll");
  const [errorText, setErrorText] = useState("");
  const [nextPollBundle, setNextPollBundle] = useState<PollBundle | null>(null);
  const [loadingNextPoll, setLoadingNextPoll] = useState(false);

  const loadNextPoll = useCallback(async (currentPollId: number, currentCategory: string) => {
    setLoadingNextPoll(true);

    const { data: pollsData } = await supabase
      .from("polls")
      .select("id, question, description, category, slug")
      .neq("id", currentPollId)
      .order("id", { ascending: false });

    const allPolls = (pollsData || []) as Poll[];

    const sameCategory = allPolls.filter((candidate) => candidate.category === currentCategory);
    const otherCategories = allPolls.filter((candidate) => candidate.category !== currentCategory);

    const pickUnvoted = (items: Poll[]) =>
      items.find((candidate) => localStorage.getItem(`poll-voted-${candidate.id}`) !== "true");

    const chosenPoll =
      pickUnvoted(sameCategory) ||
      pickUnvoted(otherCategories) ||
      sameCategory[0] ||
      otherCategories[0] ||
      null;

    if (!chosenPoll) {
      setNextPollBundle(null);
      setLoadingNextPoll(false);
      return;
    }

    const [{ data: optionsData }, { data: votesData }] = await Promise.all([
      supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", chosenPoll.id)
        .order("id", { ascending: true }),
      supabase
        .from("votes")
        .select("option_id")
        .eq("poll_id", chosenPoll.id),
    ]);

    const counts: VoteCounts = {};
    (votesData || []).forEach((vote) => {
      counts[vote.option_id] = (counts[vote.option_id] || 0) + 1;
    });

    setNextPollBundle({
      poll: chosenPoll,
      options: (optionsData || []) as PollOption[],
      voteCounts: counts,
    });

    setLoadingNextPoll(false);
  }, []);

  useEffect(() => {
    const loadPoll = async () => {
      setLoading(true);

      const { data: pollData } = await supabase
        .from("polls")
        .select("*")
        .eq("slug", slug)
        .single();

      const pollId = pollData?.id;

      if (!pollId) {
        setPoll(null);
        setOptions([]);
        setVoteCounts({});
        setSelectedOptionId(null);
        setNextPollBundle(null);
        setLoading(false);
        return;
      }

      const savedVote = localStorage.getItem(`poll-voted-${pollId}`);
      const savedSelectedOption = localStorage.getItem(`poll-selected-option-${pollId}`);

      setVoted(savedVote === "true");

      if (savedSelectedOption) {
        const parsedOptionId = parseInt(savedSelectedOption, 10);
        if (!Number.isNaN(parsedOptionId)) {
          setSelectedOptionId(parsedOptionId);
        } else {
          setSelectedOptionId(null);
        }
      } else {
        setSelectedOptionId(null);
      }

      const [{ data: optionsData }, { data: votesData }] = await Promise.all([
        supabase
          .from("poll_options")
          .select("*")
          .eq("poll_id", pollId)
          .order("id", { ascending: true }),
        supabase
          .from("votes")
          .select("option_id")
          .eq("poll_id", pollId),
      ]);

      const counts: VoteCounts = {};
      (votesData || []).forEach((vote) => {
        counts[vote.option_id] = (counts[vote.option_id] || 0) + 1;
      });

      setPoll(pollData as Poll);
      setOptions((optionsData || []) as PollOption[]);
      setVoteCounts(counts);
      setLoading(false);

      if (savedVote === "true") {
        await loadNextPoll(pollId, pollData.category);
      } else {
        setNextPollBundle(null);
      }
    };

    if (slug) {
      loadPoll();
    }
  }, [slug, loadNextPoll]);

  const handleVote = async (optionId: number) => {
    if (!poll || voted || submitting) return;

    const throttleCheck = validateClientVoteThrottle();
    if (!throttleCheck.ok) {
      setErrorText(throttleCheck.error);
      return;
    }

    setSubmitting(true);
    setErrorText("");

    try {
      await submitVote(poll.id, optionId);

      setVoteCounts((prev) => ({
        ...prev,
        [optionId]: (prev[optionId] || 0) + 1,
      }));

      recordClientVote();
      localStorage.setItem(`poll-voted-${poll.id}`, "true");
      localStorage.setItem(`poll-selected-option-${poll.id}`, String(optionId));
      setSelectedOptionId(optionId);
      setVoted(true);

      await loadNextPoll(poll.id, poll.category);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Could not submit vote.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = poll ? `Vote on this poll: ${poll.question}` : "Vote on this poll";

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Poll & See",
          text,
          url,
        });
        return;
      } catch {
        // fall through to clipboard fallback
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareText("Link copied");
      setTimeout(() => setShareText("Share poll"), 2000);
    } catch {
      setShareText("Could not copy");
      setTimeout(() => setShareText("Share poll"), 2000);
    }
  };

  const handleBack = () => {
    sessionStorage.setItem("restoreHomeScroll", "true");
    router.push("/");
  };

  if (loading) {
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

        <section className="max-w-4xl mx-auto px-6 pt-6 pb-8">
          <p>Loading poll...</p>
        </section>

        <footer className="text-center text-sm text-gray-500 py-8">
          © {new Date().getFullYear()} Poll & See
        </footer>
      </main>
    );
  }

  if (!poll) {
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

        <section className="max-w-4xl mx-auto px-6 pt-6 pb-8">
          <div className="bg-gray-800 rounded-2xl p-6">
            <h1 className="text-2xl font-bold mb-3">Poll not found</h1>
            <Link href="/" className="text-blue-300 hover:underline">
              Return to homepage
            </Link>
          </div>
        </section>

        <footer className="text-center text-sm text-gray-500 py-8">
          © {new Date().getFullYear()} Poll & See
        </footer>
      </main>
    );
  }

  const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
  const categoryColours = getCategoryColours(poll.category);

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

      <section className="max-w-4xl mx-auto px-6 pt-2 pb-8">
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-blue-300 hover:underline"
        >
          ← Back to polls
        </button>

        <div className="mt-6 bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <span
              className="text-xs px-3 py-1 rounded-full"
              style={{
                color: categoryColours.text,
                backgroundColor: categoryColours.bg,
                border: `1px solid ${categoryColours.border}`,
              }}
            >
              {poll.category}
            </span>
            <span className="text-sm text-gray-400">{totalVotes} votes</span>
          </div>

          <h1 className="text-3xl font-bold mb-4">{poll.question}</h1>
          <p className="text-gray-300 mb-8">{poll.description}</p>

          {!voted ? (
            <>
              <div className="flex flex-col gap-4">
                {options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleVote(option.id)}
                    disabled={submitting}
                    className="py-3 rounded-xl font-medium text-white transition bg-gray-700 hover:bg-gray-600 disabled:opacity-70"
                  >
                    {submitting ? "Submitting..." : option.option_text}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm text-gray-400">Vote to see results</p>

              {errorText ? (
                <p className="mt-3 text-sm text-red-300">{errorText}</p>
              ) : null}
            </>
          ) : (
            <>
              <ResultOptions
                options={options}
                voteCounts={voteCounts}
                selectedOptionId={selectedOptionId}
              />

              <p className="text-sm text-gray-400 pt-4">You’ve voted.</p>

              <div className="mt-8 border-t border-gray-700 pt-6">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleShare}
                    className="bg-white text-black px-4 py-2 rounded-xl font-medium hover:bg-gray-200 transition"
                  >
                    {shareText}
                  </button>

                  <Link
                    href={`/?category=${encodeURIComponent(poll.category)}#live-polls`}
                    className="inline-flex items-center rounded-xl border px-4 py-2 font-medium text-white transition hover:bg-gray-800"
                    style={{
                      borderColor: categoryColours.border,
                      backgroundColor: categoryColours.bg,
                      color: categoryColours.text,
                    }}
                  >
                    See other {poll.category} polls
                  </Link>

                  <button
                    onClick={handleBack}
                    className="inline-flex items-center rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 font-medium text-white transition hover:bg-gray-800"
                  >
                    Back to all polls
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {voted ? (
          <div className="mt-8">
            {loadingNextPoll ? (
              <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
                <p className="text-gray-300">Loading another poll...</p>
              </div>
            ) : nextPollBundle ? (
              <>
                <h2 className="text-xl font-semibold mb-4">
                  {nextPollBundle.poll.category === poll.category
                    ? `Another ${poll.category} poll`
                    : "Another poll"}
                </h2>

                <InlineNextPoll bundle={nextPollBundle} />
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      <footer className="text-center text-sm text-gray-500 py-8">
        © {new Date().getFullYear()} Poll & See
      </footer>
    </main>
  );
}