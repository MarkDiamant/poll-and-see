"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const loadPoll = async () => {
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
        setLoading(false);
        return;
      }

      const savedVote = localStorage.getItem(`poll-voted-${pollId}`);
      const savedSelectedOption = localStorage.getItem(`poll-selected-option-${pollId}`);

      if (savedVote === "true") {
        setVoted(true);
      }

      if (savedSelectedOption) {
        const parsedOptionId = parseInt(savedSelectedOption, 10);
        if (!Number.isNaN(parsedOptionId)) {
          setSelectedOptionId(parsedOptionId);
        }
      }

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
      (votesData || []).forEach((vote) => {
        counts[vote.option_id] = (counts[vote.option_id] || 0) + 1;
      });

      setPoll(pollData);
      setOptions(optionsData || []);
      setVoteCounts(counts);
      setLoading(false);
    };

    if (slug) {
      loadPoll();
    }
  }, [slug]);

  const handleVote = async (optionId: number) => {
    if (!poll || voted || submitting) return;

    setSubmitting(true);

    const { error } = await supabase.from("votes").insert({
      poll_id: poll.id,
      option_id: optionId,
    });

    if (!error) {
      setVoteCounts((prev) => ({
        ...prev,
        [optionId]: (prev[optionId] || 0) + 1,
      }));
      localStorage.setItem(`poll-voted-${poll.id}`, "true");
      localStorage.setItem(`poll-selected-option-${poll.id}`, String(optionId));
      setSelectedOptionId(optionId);
      setVoted(true);
    }

    setSubmitting(false);
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
  const highestVoteCount = Math.max(...options.map((option) => voteCounts[option.id] || 0), 0);

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
            </>
          ) : (
            <div className="space-y-4">
              {options.map((option, index) => {
                const count = voteCounts[option.id] || 0;
                const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const isSelected = selectedOptionId === option.id;
                const isLeader = count > 0 && count === highestVoteCount;
                const optionColour = getOptionColour(index);

                return (
                  <div
                    key={option.id}
                    className="rounded-2xl"
                    style={{
                      border: isSelected ? `3px solid ${optionColour}` : "3px solid transparent",
                      boxShadow: isSelected ? `0 0 0 1px ${optionColour}55, 0 0 18px ${optionColour}22` : "none",
                    }}
                  >
                    <div className="px-3 pt-3">
                      <div className="flex items-start gap-2">
                        {isSelected ? (
                          <span
                            className="mt-0.5 shrink-0 text-base font-bold"
                            style={{ color: optionColour }}
                          >
                            ✓
                          </span>
                        ) : null}

                        <span className="flex-1 min-w-0 leading-6 break-words text-white">
                          {option.option_text}
                        </span>
                      </div>

                      <div className="mt-2 flex justify-end">
                        <span className="shrink-0 text-right text-sm font-semibold text-gray-300">
                          {percent}%
                        </span>
                      </div>
                    </div>

                    <div className="px-3 pb-3 pt-2">
                      <div
                        className={`rounded-xl p-2 ${isLeader ? "bg-gray-900/55" : ""}`}
                      >
                        <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-4 transition-all"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: optionColour,
                              opacity: isLeader ? 1 : 0.92,
                              boxShadow: isLeader ? `0 0 12px ${optionColour}55` : "none",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <p className="text-sm text-gray-400 pt-2">You’ve voted.</p>
            </div>
          )}

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
            </div>

            <div className="mt-4 text-sm text-gray-400">
              <Link href="/submit-poll" className="text-blue-300 hover:underline">
                Want to run your own poll? →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="text-center text-sm text-gray-500 py-8">
        © {new Date().getFullYear()} Poll & See
      </footer>
    </main>
  );
}