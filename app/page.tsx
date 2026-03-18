"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Poll = {
  id: number;
  question: string;
  description: string;
  category: string;
  slug: string;
  created_at?: string;
};

type PollOption = {
  id: number;
  poll_id: number;
  option_text: string;
};

export default function Home() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [featuredOptions, setFeaturedOptions] = useState<PollOption[]>([]);
  const [featuredVoteCounts, setFeaturedVoteCounts] = useState<Record<number, number>>({});
  const [totalSiteVotes, setTotalSiteVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHomeData = useCallback(async () => {
    setError("");

    const { data: pollsData, error: pollsError } = await supabase
      .from("polls")
      .select("*")
      .order("id", { ascending: true });

    if (pollsError) {
      setError("Error loading polls.");
      setLoading(false);
      return;
    }

    const safePolls = pollsData || [];
    setPolls(safePolls);

    const featuredPoll = safePolls[0];

    const { data: allVotes } = await supabase.from("votes").select("id");
    setTotalSiteVotes(allVotes?.length || 0);

    if (!featuredPoll) {
      setFeaturedOptions([]);
      setFeaturedVoteCounts({});
      setLoading(false);
      return;
    }

    const { data: optionsData } = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", featuredPoll.id)
      .order("id", { ascending: true });

    const { data: votesData } = await supabase
      .from("votes")
      .select("option_id")
      .eq("poll_id", featuredPoll.id);

    const counts: Record<number, number> = {};

    (votesData || []).forEach((vote) => {
      counts[vote.option_id] = (counts[vote.option_id] || 0) + 1;
    });

    setFeaturedOptions(optionsData || []);
    setFeaturedVoteCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  useEffect(() => {
    const handleFocus = () => {
      loadHomeData();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadHomeData();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadHomeData]);

  const featuredPoll = polls[0];

  const totalFeaturedVotes = Object.values(featuredVoteCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
        <section className="max-w-6xl mx-auto px-6 pt-10 pb-12">
          <p>Loading...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <header className="max-w-6xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">PollAndSee</h1>

        <div className="flex gap-3">
          <Link
            href="/"
            className="text-sm px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700"
          >
            Home
          </Link>

          <Link
            href="/submit-poll"
            className="text-sm px-4 py-2 rounded-lg bg-white text-black hover:bg-gray-200"
          >
            Submit Poll
          </Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-4 pb-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">PollAndSee</h1>
          <p className="text-lg text-gray-300 mb-4">See what people really think</p>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-gray-200">
            <span className="font-semibold">{totalSiteVotes}</span>
            <span>total votes across the site</span>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-blue-300 bg-blue-500/10 px-3 py-1 rounded-full">
                Featured Poll
              </span>
              <span className="text-sm text-gray-400">
                {totalFeaturedVotes} votes
              </span>
            </div>

            {featuredPoll ? (
              <>
                <h2 className="text-2xl font-semibold mb-3">
                  {featuredPoll.question}
                </h2>

                <p className="text-gray-300 mb-6">
                  {featuredPoll.description}
                </p>

                <div className="space-y-4 mb-6">
                  {featuredOptions.map((option) => {
                    const count = featuredVoteCounts[option.id] || 0;
                    const percent =
                      totalFeaturedVotes > 0
                        ? Math.round((count / totalFeaturedVotes) * 100)
                        : 0;

                    const barColor =
                      option.option_text.toLowerCase() === "yes"
                        ? "bg-green-500"
                        : option.option_text.toLowerCase() === "no"
                        ? "bg-red-500"
                        : "bg-blue-500";

                    return (
                      <div key={option.id}>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>{option.option_text}</span>
                          <span>{percent}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                          <div
                            className={`${barColor} h-4`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Link
                  href={`/poll/${featuredPoll.slug}`}
                  className="inline-block bg-white text-black px-5 py-3 rounded-xl font-medium hover:bg-gray-200 transition"
                >
                  Vote on featured poll
                </Link>
              </>
            ) : (
              <p className="text-gray-300">No polls found.</p>
            )}
          </div>

          <div className="bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-4">About</h3>
            <p className="text-gray-300 mb-4">
              Vote on real questions. Compare your answer. See how others think.
            </p>

            <div className="border-t border-gray-700 pt-4">
              <Link
                href="/submit-poll"
                className="block w-full text-center bg-white text-black py-3 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                Submit a Poll
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-2xl font-semibold">Live Polls</h3>
          <span className="text-sm text-gray-400">
            {polls.length} active polls
          </span>
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {polls.map((poll) => (
            <Link
              key={poll.id}
              href={`/poll/${poll.slug}`}
              className="bg-gray-800 rounded-2xl p-5 shadow-lg transition border border-gray-700 hover:border-gray-500"
            >
              <div className="mb-3">
                <span className="text-xs text-blue-300 bg-blue-500/10 px-2 py-1 rounded-full">
                  {poll.category}
                </span>
              </div>

              <h4 className="text-lg font-semibold mb-2">{poll.question}</h4>
              <p className="text-sm text-gray-300 mb-4">{poll.description}</p>

              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>View poll</span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}