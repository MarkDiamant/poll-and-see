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

type VoteInsertPayload = {
  poll_id?: number;
  option_id?: number;
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

function LiveVoteCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === displayValue) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setPreviousValue(displayValue);
    setDisplayValue(value);
    setIsAnimating(true);

    timeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
    }, 250);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, displayValue]);

  const currentFormatted = displayValue.toLocaleString();
  const previousFormatted = previousValue.toLocaleString();

  return (
    <div className="mt-5 mb-2 text-center">
      <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
        Total votes cast
      </p>

      <div className="mt-2 inline-flex items-center justify-center rounded-2xl border border-gray-800 bg-gray-900/70 px-5 py-3 shadow-lg">
        <div className="relative h-[2.2rem] overflow-hidden md:h-[2.8rem]">
          <div
            className="flex flex-col transition-transform duration-200 ease-out"
            style={{
              transform: isAnimating ? "translateY(-50%)" : "translateY(0%)",
            }}
          >
            <span className="flex h-[2.2rem] items-center justify-center leading-none text-3xl md:h-[2.8rem] md:text-4xl font-bold text-white">
              {previousFormatted}
            </span>
            <span className="flex h-[2.2rem] items-center justify-center leading-none text-3xl md:h-[2.8rem] md:text-4xl font-bold text-white">
              {currentFormatted}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function Home() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [featuredOptions, setFeaturedOptions] = useState<PollOption[]>([]);
  const [featuredVoteCounts, setFeaturedVoteCounts] = useState<Record<number, number>>({});
  const [totalVoteCount, setTotalVoteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [featuredPollVoted, setFeaturedPollVoted] = useState(false);
  const [featuredSelectedOptionId, setFeaturedSelectedOptionId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const loadHomeData = useCallback(async () => {
    setLoading(true);

    const [{ data: pollsData }, { count: votesCount }] = await Promise.all([
      supabase
        .from("polls")
        .select("id, question, description, category, slug, featured")
        .order("id", { ascending: false }),
      supabase.from("votes").select("*", { count: "exact", head: true }),
    ]);

    const safePolls = pollsData || [];
    setPolls(safePolls);
    setTotalVoteCount(votesCount || 0);

    const availableCategories = [
      "All",
      ...Array.from(
        new Set(
          safePolls
            .map((poll) => poll.category?.trim())
            .filter((category): category is string => Boolean(category))
        )
      ).sort((a, b) => a.localeCompare(b)),
    ];

    const params = new URLSearchParams(window.location.search);
    const queryCategory = params.get("category");
    const savedCategory = sessionStorage.getItem("selectedPollCategory");
    const preferredCategory = queryCategory || savedCategory || "All";

    if (availableCategories.includes(preferredCategory)) {
      setSelectedCategory(preferredCategory);
    } else {
      setSelectedCategory("All");
    }

    const chosenFeaturedPoll = safePolls.find((p) => p.featured) || safePolls[0];

    if (!chosenFeaturedPoll) {
      setFeaturedOptions([]);
      setFeaturedVoteCounts({});
      setFeaturedPollVoted(false);
      setFeaturedSelectedOptionId(null);
      setLoading(false);
      return;
    }

    const savedVote = localStorage.getItem(`poll-voted-${chosenFeaturedPoll.id}`);
    const savedSelectedOption = localStorage.getItem(`poll-selected-option-${chosenFeaturedPoll.id}`);

    setFeaturedPollVoted(savedVote === "true");

    if (savedSelectedOption) {
      const parsedOptionId = parseInt(savedSelectedOption, 10);
      setFeaturedSelectedOptionId(Number.isNaN(parsedOptionId) ? null : parsedOptionId);
    } else {
      setFeaturedSelectedOptionId(null);
    }

    const [{ data: optionsData }, { data: votesData }] = await Promise.all([
      supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", chosenFeaturedPoll.id)
        .order("id", { ascending: true }),
      supabase
        .from("votes")
        .select("option_id")
        .eq("poll_id", chosenFeaturedPoll.id),
    ]);

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

  useEffect(() => {
    sessionStorage.setItem("selectedPollCategory", selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    if (!loading) {
      const shouldRestore = sessionStorage.getItem("restoreHomeScroll");
      const lastViewedPollSlug = sessionStorage.getItem("lastViewedPollSlug");

      if (shouldRestore === "true") {
        setTimeout(() => {
          if (lastViewedPollSlug) {
            const pollCard = document.getElementById(`poll-card-${lastViewedPollSlug}`);
            if (pollCard) {
              pollCard.scrollIntoView({ behavior: "auto", block: "center" });
              sessionStorage.removeItem("restoreHomeScroll");
              return;
            }
          }

          const savedScroll = sessionStorage.getItem("homeScrollY");
          if (savedScroll) {
            const scrollY = parseInt(savedScroll, 10);
            if (!Number.isNaN(scrollY)) {
              window.scrollTo({ top: scrollY, behavior: "auto" });
            }
          }

          sessionStorage.removeItem("restoreHomeScroll");
        }, 100);
      }
    }
  }, [loading, selectedCategory]);

  useEffect(() => {
    if (loading) return;

    if (window.location.hash === "#live-polls") {
      setTimeout(() => {
        const livePollsSection = document.getElementById("live-polls");
        if (livePollsSection) {
          livePollsSection.scrollIntoView({ behavior: "auto", block: "start" });
        }
      }, 100);
    }
  }, [loading, selectedCategory]);

  const featuredPoll = polls.find((p) => p.featured) || polls[0];

  useEffect(() => {
    if (!featuredPoll?.id) return;

    const channel = supabase
      .channel(`homepage-votes-${featuredPoll.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
        },
        (payload) => {
          const newVote = payload.new as VoteInsertPayload;

          setTotalVoteCount((prev) => prev + 1);

          if (newVote.poll_id === featuredPoll.id && typeof newVote.option_id === "number") {
            setFeaturedVoteCounts((prev) => ({
              ...prev,
              [newVote.option_id as number]: (prev[newVote.option_id as number] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [featuredPoll?.id]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);

    const params = new URLSearchParams(window.location.search);
    if (params.has("category")) {
      params.delete("category");
      const newSearch = params.toString();
      const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", newUrl);
    }
  };

  const handlePollClick = (poll: Poll) => {
    sessionStorage.setItem("lastViewedPollSlug", poll.slug);
    sessionStorage.setItem("selectedPollCategory", selectedCategory);
    sessionStorage.setItem("homeScrollY", String(window.scrollY));
  };

  const totalFeaturedVotes = Object.values(featuredVoteCounts).reduce(
    (sum, count) => sum + count,
    0
  );

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
          <p className="text-lg text-gray-300">See what people really think</p>
          <LiveVoteCounter value={totalVoteCount} />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-blue-300 bg-blue-500/10 px-3 py-1 rounded-full">
                Featured Poll
              </span>

              {featuredPoll ? (
                <span className="text-sm text-gray-400">{totalFeaturedVotes} votes</span>
              ) : null}
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
                    const isSelected =
                      featuredPollVoted && featuredSelectedOptionId === option.id;
                    const optionColour = getOptionColour(index);

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

                              <span className="min-w-0 leading-6 break-words text-white">
                                {option.option_text}
                              </span>
                            </div>

                            <span className="shrink-0 whitespace-nowrap text-right text-sm font-semibold text-gray-300">
                              {percent}%
                            </span>
                          </div>
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

              const categoryColours = getCategoryColours(category);

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryChange(category)}
                  className={`col-span-2 h-10 rounded-xl px-2 text-sm font-medium transition lg:min-w-0 lg:flex-1 ${mobileCenterClass}`}
                  style={
                    isActive
                      ? {
                          backgroundColor: categoryColours.solid,
                          border: `1px solid ${categoryColours.solid}`,
                          color: "#ffffff",
                        }
                      : {
                          backgroundColor: categoryColours.bg,
                          border: `1px solid ${categoryColours.border}`,
                          color: categoryColours.text,
                        }
                  }
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {livePolls.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {livePolls.map((poll) => {
              const categoryColours = getCategoryColours(poll.category);

              return (
                <Link
                  key={poll.id}
                  id={`poll-card-${poll.slug}`}
                  href={`/poll/${poll.slug}`}
                  onClick={() => handlePollClick(poll)}
                  className="bg-gray-800 rounded-2xl p-5 shadow-lg transition border border-gray-700 hover:border-gray-500"
                >
                  <div className="mb-3">
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        color: categoryColours.text,
                        backgroundColor: categoryColours.bg,
                        border: `1px solid ${categoryColours.border}`,
                      }}
                    >
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
              );
            })}
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