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

type VoteCounts = Record<number, number>;

type PollBundle = {
  poll: Poll;
  options: PollOption[];
  voteCounts: VoteCounts;
};

const POLL_BUNDLE_CACHE_PREFIX = "poll-bundle-cache:";
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

function getCommonPrefixLength(a: string, b: string) {
  const maxLength = Math.min(a.length, b.length);
  let i = 0;

  while (i < maxLength && a[i] === b[i]) {
    i += 1;
  }

  return i;
}

function setCachedPollBundle(bundle: PollBundle) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(`${POLL_BUNDLE_CACHE_PREFIX}${bundle.poll.slug}`, JSON.stringify(bundle));
  } catch {
    // ignore cache failures
  }
}

function LiveVoteCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [animationFrom, setAnimationFrom] = useState(value);
  const [animationTo, setAnimationTo] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [translateActive, setTranslateActive] = useState(false);

  const stepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isAnimating || displayValue === value) return;

    const stepDelay = Math.abs(value - displayValue) > 10 ? 180 : 340;

    stepTimeoutRef.current = setTimeout(() => {
      const direction = value > displayValue ? 1 : -1;
      const nextValue = displayValue + direction;

      setAnimationFrom(displayValue);
      setAnimationTo(nextValue);
      setIsAnimating(true);
      setTranslateActive(false);

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = window.requestAnimationFrame(() => {
          setTranslateActive(true);
        });
      });

      settleTimeoutRef.current = setTimeout(() => {
        setDisplayValue(nextValue);
        setIsAnimating(false);
        setTranslateActive(false);
      }, 1100);
    }, stepDelay);

    return () => {
      if (stepTimeoutRef.current) {
        clearTimeout(stepTimeoutRef.current);
      }
    };
  }, [value, displayValue, isAnimating]);

  useEffect(() => {
    return () => {
      if (stepTimeoutRef.current) {
        clearTimeout(stepTimeoutRef.current);
      }
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const settledFormatted = displayValue.toLocaleString();
  const fromFormatted = animationFrom.toLocaleString();
  const toFormatted = animationTo.toLocaleString();

  const commonPrefixLength = isAnimating
    ? getCommonPrefixLength(fromFormatted, toFormatted)
    : settledFormatted.length;

  const stablePrefix = isAnimating
    ? fromFormatted.slice(0, commonPrefixLength)
    : settledFormatted;

  const previousSuffix = isAnimating ? fromFormatted.slice(commonPrefixLength) : "";
  const nextSuffix = isAnimating ? toFormatted.slice(commonPrefixLength) : "";

  const fixedWidthCh = Math.max(
    settledFormatted.length,
    fromFormatted.length,
    toFormatted.length,
    value.toLocaleString().length
  );

  const suffixWidthCh = Math.max(previousSuffix.length, nextSuffix.length, 1);

  return (
    <div className="mt-6 mb-2 text-center">
      <div className="inline-flex h-[116px] min-w-[214px] flex-col items-center justify-center rounded-2xl border border-cyan-400/55 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),_rgba(8,15,30,0.98)_56%)] px-6 py-3 shadow-[0_0_44px_rgba(34,211,238,0.20)]">
        <p className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
          Total Votes Cast
        </p>

        <div
          className="mt-3 flex h-[62px] items-center justify-center overflow-hidden text-4xl md:text-5xl font-bold leading-none text-white tabular-nums"
          style={{ minWidth: `${fixedWidthCh}ch` }}
        >
          <span className="whitespace-pre">{stablePrefix}</span>

          {isAnimating ? (
            <span
              className="relative inline-flex overflow-hidden whitespace-pre align-middle"
              style={{
                height: "1.28em",
                minWidth: `${suffixWidthCh}ch`,
                paddingRight: "0.03em",
              }}
            >
              <span
                className="absolute left-0 top-0 flex w-full flex-col ease-out"
                style={{
                  transform: translateActive ? "translateY(-1.28em)" : "translateY(0)",
                  transitionDuration: translateActive ? "1100ms" : "0ms",
                  transitionProperty: "transform",
                }}
              >
                <span
                  className="flex items-center justify-center leading-none"
                  style={{ height: "1.28em" }}
                >
                  {previousSuffix}
                </span>
                <span
                  className="flex items-center justify-center leading-none"
                  style={{ height: "1.28em" }}
                >
                  {nextSuffix}
                </span>
              </span>
            </span>
          ) : null}
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
    const channel = supabase
      .channel("homepage-live-votes")
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

          if (featuredPoll?.id && newVote.poll_id === featuredPoll.id && typeof newVote.option_id === "number") {
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

  useEffect(() => {
    const syncVoteCount = async () => {
      const { count } = await supabase.from("votes").select("*", { count: "exact", head: true });

      if (typeof count === "number") {
        setTotalVoteCount(count);
      }
    };

    const interval = setInterval(syncVoteCount, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!featuredPoll?.id) return;

    const syncFeaturedVotes = async () => {
      const { data } = await supabase
        .from("votes")
        .select("option_id")
        .eq("poll_id", featuredPoll.id);

      const counts: Record<number, number> = {};
      (data || []).forEach((vote) => {
        counts[vote.option_id] = (counts[vote.option_id] || 0) + 1;
      });

      setFeaturedVoteCounts(counts);
    };

    const interval = setInterval(syncFeaturedVotes, 2000);

    return () => {
      clearInterval(interval);
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

  useEffect(() => {
    if (loading) return;

    const pollsToCache = [featuredPoll, ...livePolls.slice(0, 12)].filter(
      (poll): poll is Poll => Boolean(poll)
    );

    const cachePollBundles = async () => {
      await Promise.all(
        pollsToCache.map(async (poll) => {
          try {
            const [{ data: optionsData }, { data: votesData }] = await Promise.all([
              supabase
                .from("poll_options")
                .select("*")
                .eq("poll_id", poll.id)
                .order("id", { ascending: true }),
              supabase
                .from("votes")
                .select("option_id")
                .eq("poll_id", poll.id),
            ]);

            const counts: VoteCounts = {};
            (votesData || []).forEach((vote: { option_id: number }) => {
              counts[vote.option_id] = (counts[vote.option_id] || 0) + 1;
            });

            setCachedPollBundle({
              poll,
              options: (optionsData || []) as PollOption[],
              voteCounts: counts,
            });
          } catch {
            // ignore cache failures
          }
        })
      );
    };

    const timeoutId = window.setTimeout(() => {
      void cachePollBundles();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loading, featuredPoll, livePolls]);

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

          <div className="bg-gray-800 rounded-2xl p-6 shadow-lg flex flex-col justify-center">
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