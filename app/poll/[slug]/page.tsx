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

const getOptionColour = (index: number) => {
  return OPTION_COLOURS[index] || OPTION_COLOURS[OPTION_COLOURS.length - 1];
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
        setLoading(false);
        return;
      }

      const savedVote = localStorage.getItem(`poll-voted-${pollId}`);
      if (savedVote === "true") {
        setVoted(true);
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
                Submit Poll
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
                Submit Poll
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
              Submit Poll
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
          ← Back to all polls
        </button>

        <div className="mt-6 bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-blue-300 bg-blue-500/10 px-3 py-1 rounded-full">
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
            <div className="space-y-5">
              {options.map((option, index) => {
                const count = voteCounts[option.id] || 0;
                const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

                return (
                  <div key={option.id}>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>{option.option_text}</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div
                        className="h-4"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: getOptionColour(index),
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              <p className="text-sm text-gray-400 pt-2">You’ve voted.</p>
            </div>
          )}

          <div className="mt-8 border-t border-gray-700 pt-6">
            <button
              onClick={handleShare}
              className="bg-white text-black px-4 py-2 rounded-xl font-medium hover:bg-gray-200 transition"
            >
              {shareText}
            </button>
          </div>
        </div>
      </section>

      <footer className="text-center text-sm text-gray-500 py-8">
        © {new Date().getFullYear()} Poll & See
      </footer>
    </main>
  );
}