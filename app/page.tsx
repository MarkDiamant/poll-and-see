"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Poll = {
  id: number;
  question: string;
  description: string;
  category: string;
  slug: string;
  featured?: boolean;
};

type PollOption = {
  id: number;
  poll_id: number;
  option_text: string;
};

const OPTION_COLOURS = ["#2563eb", "#22c55e", "#fbbf24", "#ec4899"];

const getOptionColour = (index: number) => {
  return OPTION_COLOURS[index] || OPTION_COLOURS[OPTION_COLOURS.length - 1];
};

export default function Home() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [featuredOptions, setFeaturedOptions] = useState<PollOption[]>([]);
  const [featuredVoteCounts, setFeaturedVoteCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [featuredPollVoted, setFeaturedPollVoted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categoryInitialised, setCategoryInitialised] = useState(false);

  const hasPersistedCategoryRef = useRef(false);

  const loadHomeData = useCallback(async () => {
    setLoading(true);

    const { data: pollsData } = await supabase
      .from("polls")
      .select("id, question, description, category, slug, featured")
      .order("id", { ascending: false });

    const safePolls = pollsData || [];
    setPolls(safePolls);

    const chosenFeaturedPoll = safePolls.find((p) => p.featured) || safePolls[0];

    if (!chosenFeaturedPoll) {
      setFeaturedOptions([]);
      setFeaturedVoteCounts({});
      setFeaturedPollVoted(false);
      setLoading(false);
      return;
    }

    const savedVote = localStorage.getItem(`poll-voted-${chosenFeaturedPoll.id}`);
    setFeaturedPollVoted(savedVote === "true");

    const { data: optionsData } = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", chosenFeaturedPoll.id)
      .order("id", { ascending: true });

    const { data: votesData } = await supabase
      .from("votes")
      .select("option_id")
      .eq("poll_id", chosenFeaturedPoll.id);

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
    const handleFocus = () => loadHomeData();
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

  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem("homeScrollY", String(window.scrollY));
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        polls
          .map((poll) => poll.category?.trim())
          .filter((category): category is string => Boolean(category))
      )
    ).sort((a, b) => a.localeCompare(b));

    return ["All", ...uniqueCategories];
  }, [polls]);

  useEffect(() => {
    if (categories.length === 0 || categoryInitialised) return;

    const savedCategory = sessionStorage.getItem("selectedPollCategory");
    const preferredCategory = savedCategory || "All";

    if (categories.includes(preferredCategory)) {
      setSelectedCategory(preferredCategory);
    } else {
      setSelectedCategory("All");
    }

    setCategoryInitialised(true);
  }, [categories, categoryInitialised]);

  useEffect(() => {
    if (!categoryInitialised) return;

    if (!hasPersistedCategoryRef.current) {
      hasPersistedCategoryRef.current = true;
      return;
    }

    sessionStorage.setItem("selectedPollCategory", selectedCategory);
  }, [selectedCategory, categoryInitialised]);

  useEffect(() => {
    if (!loading) {
      const shouldRestore = sessionStorage.getItem("restoreHomeScroll");

      if (shouldRestore === "true") {
        const savedScroll = sessionStorage.getItem("homeScrollY");

        if (savedScroll) {
          const scrollY = parseInt(savedScroll, 10);

          if (!Number.isNaN(scrollY)) {
            setTimeout(() => {
              window.scrollTo({ top: scrollY, behavior: "auto" });
              sessionStorage.removeItem("restoreHomeScroll");
            }, 50);
          }
        } else {
          sessionStorage.removeItem("restoreHomeScroll");
        }
      }
    }
  }, [loading]);

  useEffect(() => {
    if (!categoryInitialised || loading) return;

    if (window.location.hash === "#live-polls") {
      setTimeout(() => {
        const livePollsSection = document.getElementById("live-polls");
        if (livePollsSection) {
          livePollsSection.scrollIntoView({ behavior: "auto", block: "start" });
        }
      }, 100);
    }
  }, [categoryInitialised, selectedCategory, loading]);

  const featuredPoll = polls.find((p) => p.featured) || polls[0];

  const totalFeaturedVotes = Object.values(featuredVoteCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const filteredPolls = useMemo(() => {
    if (selectedCategory === "All") {
      return polls;
    }

    return polls.filter((poll) => poll.category === selectedCategory);
  }, [polls, selectedCategory]);

  const livePolls = useMemo(() => {
    return filteredPolls.filter((poll) => poll.id !== featuredPoll?.id);
  }, [filteredPolls, featuredPoll]);

  const activePollCount = filteredPolls.length;

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

      <section className="max-w-6xl mx-auto px-6 pt-4 pb-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Poll & See</h1>
          <p className="text-lg text-gray-300 mb-4">See what people really think</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-blue-300 bg-blue-500/10 px-3 py-1 rounded-full">
                Featured Poll
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
                  {featuredOptions.map((option, index) => {
                    const count = featuredVoteCounts[option.id] || 0;
                    const percent =
                      totalFeaturedVotes > 0
                        ? Math.round((count / totalFeaturedVotes) * 100)
                        : 0;

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
                </div>

                <Link
                  href={`/poll/${featuredPoll.slug}`}
                  className="inline-block bg-white text-black px-5 py-3 rounded-xl font-medium hover:bg-gray-200 transition"
                >
                  {featuredPollVoted ? "View poll" : "Vote on featured poll"}
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

            <p className="text-gray-300 mb-4">
              From everyday opinions to testing ideas, create a poll and see what people really think.
            </p>

            <div className="border-t border-gray-700 pt-4">
              <Link
                href="/submit-poll"
                className="block w-full text-center rounded-xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-500"
              >
                Create a Poll
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="live-polls" className="max-w-6xl mx-auto px-6 pb-12 scroll-mt-6">
        <div className="mb-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-2xl font-semibold">Live Polls</h3>
            <span className="text-base text-gray-300 font-medium">
              {activePollCount} active polls
            </span>
          </div>

          <div className="mt-4 grid grid-cols-6 gap-2 lg:flex lg:flex-nowrap lg:gap-2">
            {categories.map((category, index) => {
              const isActive = selectedCategory === category;
              const mobileCenterClass =
                categories.length === 8 && index === 6
                  ? "col-start-2"
                  : categories.length === 8 && index === 7
                  ? "col-start-4"
                  : "";

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`col-span-2 h-10 rounded-xl px-2 text-sm font-medium transition lg:min-w-0 lg:flex-1 ${mobileCenterClass} ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {livePolls.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {livePolls.map((poll) => (
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
        ) : (
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <p className="text-gray-300">
              No polls found in this category.
            </p>
          </div>
        )}
      </section>

      <footer className="text-center text-sm text-gray-500 py-8">
        © {new Date().getFullYear()} Poll & See
      </footer>
    </main>
  );
}