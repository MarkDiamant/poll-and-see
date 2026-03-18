"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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

export default function PollPage() {
  const params = useParams();
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
          title: "PollAndSee",
          text,
          url,
        });
        return;
      } catch {}
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-6">
        <div className="max-w-2xl mx-auto mt-16">
          <p>Loading poll...</p>
        </div>
      </main>
    );
  }

  if (!poll) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-6">
        <div className="max-w-2xl mx-auto mt-16 bg-gray-800 rounded-2xl p-6">
          <h1 className="text-2xl font-bold mb-3">Poll not found</h1>
          <Link href="/" className="text-blue-300 hover:underline">
            Return to homepage
          </Link>
        </div>
      </main>
    );
  }

  const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <section className="max-w-4xl mx-auto px-6 pt-10 pb-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm text-blue-300 hover:underline">
            ← Back to all polls
          </Link>

          <button
            onClick={handleShare}
            className="text-sm bg-white text-black px-4 py-2 rounded-xl font-medium hover:bg-gray-200 transition"
          >
            {shareText}
          </button>
        </div>

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
            <div className="flex flex-col gap-4">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  disabled={submitting}
                  className={`py-3 rounded-xl font-medium transition ${
                    option.option_text.toLowerCase() === "yes"
                      ? "bg-green-600 hover:bg-green-700"
                      : option.option_text.toLowerCase() === "no"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  {submitting ? "Submitting..." : option.option_text}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {options.map((option) => {
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
                        className={
                          option.option_text.toLowerCase() === "yes"
                            ? "bg-green-500 h-4"
                            : option.option_text.toLowerCase() === "no"
                            ? "bg-red-500 h-4"
                            : "bg-blue-500 h-4"
                        }
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <p className="text-sm text-gray-400 pt-2">Your vote has been recorded.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}