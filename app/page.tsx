"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Footer from "@/components/Footer";

type Poll = {
  id: number;
  question: string;
  description: string;
  category: string;
  slug: string;
  featured?: boolean;
  is_private?: boolean;
  created_at?: string | null;
};

type PollOption = {
  id: number;
  poll_id: number;
  option_text: string;
  vote_count: number;
  image_url?: string | null;
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

type BadgeLabel = "New" | "Trending" | "Popular";

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

const POLL_BUNDLE_CACHE_PREFIX = "poll-bundle-cache:";
const POLL_EMAIL_SUBSCRIBED_KEY = "poll-email-subscribed";
const OPTION_COLOURS = ["#2563eb", "#22c55e", "#fbbf24", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#ef4444"];
const SIGNUP_CATEGORIES = [
  "Business",
  "Community",
  "Education",
  "Finance",
  "Fun",
  "General",
  "Lifestyle",
];

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

const STATUS_RIBBON_COLOURS: Record<BadgeLabel, string> = {
  New: "bg-emerald-600/95",
  Trending: "bg-amber-400/95",
  Popular: "bg-blue-500/95",
};

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

function getCategorySummary(selected: string[]) {
  if (selected.length === 0 || selected.includes("All Categories")) {
    return "All Categories";
  }

  if (selected.length <= 2) {
    return selected.join(", ");
  }

  return `${selected.length} categories selected`;
}

function getBadgeLabel(
  poll: Poll,
  trendingIds: Set<number>,
  popularIds: Set<number>
): BadgeLabel | null {
  const now = Date.now();
  const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;

  if (trendingIds.has(poll.id)) {
    return "Trending";
  }

  if (poll.created_at) {
    const createdAtTime = new Date(poll.created_at).getTime();
    if (!Number.isNaN(createdAtTime) && createdAtTime >= fortyEightHoursAgo) {
      return "New";
    }
  }

  if (popularIds.has(poll.id)) {
    return "Popular";
  }

  return null;
}

function StatusRibbon({ label }: { label: BadgeLabel }) {
  return (
    <span
      className={`inline-flex h-6 items-center justify-center rounded-l-full rounded-r-none px-3 leading-none text-[12px] font-semibold text-white ${STATUS_RIBBON_COLOURS[label]}`}
      style={{ paddingTop: label === "Trending" ? "2px" : "1px" }}
    >
      {label.toUpperCase()}
    </span>
  );
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
      if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
    <div className="mb-1 mt-4 text-center">
      <div className="inline-flex h-[104px] min-w-[206px] flex-col items-center justify-center rounded-2xl border border-cyan-400/55 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),_rgba(8,15,30,0.98)_56%)] px-6 py-3 shadow-[0_0_44px_rgba(34,211,238,0.20)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100 md:text-[11px]">
          Total Votes Cast
        </p>

        <div
          className="mt-2 flex h-[56px] items-center justify-center overflow-hidden text-4xl font-bold leading-none text-white tabular-nums md:text-5xl"
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
  const [totalPollCount, setTotalPollCount] = useState(0);
  const [featuredOptions, setFeaturedOptions] = useState<PollOption[]>([]);
  const [featuredVoteCounts, setFeaturedVoteCounts] = useState<Record<number, number>>({});
  const [totalVoteCount, setTotalVoteCount] = useState(0);
  const [votesLast24, setVotesLast24] = useState(0);
  const [trendingPollIds, setTrendingPollIds] = useState<number[]>([]);
  const [popularPollIds, setPopularPollIds] = useState<number[]>([]);
  const [recentVoteCounts, setRecentVoteCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [featuredPollVoted, setFeaturedPollVoted] = useState(false);
  const [featuredSelectedOptionId, setFeaturedSelectedOptionId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [subscriberCategories, setSubscriberCategories] = useState<string[]>(["All Categories"]);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [subscribeError, setSubscribeError] = useState("");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [showTopButton, setShowTopButton] = useState(false);
  const [showActivityIndicator, setShowActivityIndicator] = useState(false);

  const categoryMenuRef = useRef<HTMLDivElement | null>(null);

  const syncTotalVoteCount = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("site_stats")
        .select("total_votes")
        .eq("key", "global")
        .single();

      if (!error) {
        setTotalVoteCount(data?.total_votes || 0);
      }
    } catch {
      // ignore sync failures
    }
  }, []);

  const syncFeaturedVoteCounts = useCallback(async (pollId: number) => {
    try {
      const { data, error } = await supabase
        .from("poll_options")
        .select("id, poll_id, option_text, vote_count, image_url")
        .eq("poll_id", pollId)
        .order("id", { ascending: true });

      if (error) return;

      const options = (data || []) as PollOption[];
      const counts: Record<number, number> = {};

      options.forEach((option) => {
        counts[option.id] = option.vote_count || 0;
      });

      setFeaturedOptions(options);
      setFeaturedVoteCounts(counts);
    } catch {
      // ignore sync failures
    }
  }, []);

  const syncVoteDerivedData = useCallback(async (pollList: Poll[]) => {
    if (pollList.length === 0) {
      setTrendingPollIds([]);
      setPopularPollIds([]);
      setRecentVoteCounts({});
      setVotesLast24(0);
      return;
    }

    try {
      const validPollIds = new Set(pollList.map((poll) => poll.id));
      const now = new Date();
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const twentyFourHoursAgoMs = now.getTime() - 24 * 60 * 60 * 1000;

      const [recentVotesResult, optionTotalsResult] = await Promise.all([
        supabase
          .from("votes")
          .select("poll_id, created_at")
          .gte("created_at", fortyEightHoursAgo),
        supabase
          .from("poll_options")
          .select("poll_id, vote_count"),
      ]);

      if (recentVotesResult.error) {
        console.error("Homepage recent votes query failed", recentVotesResult.error);
      }

      if (optionTotalsResult.error) {
        console.error("Homepage option totals query failed", optionTotalsResult.error);
      }

           const recentCounts: Record<number, number> = {};
      let last24Total = 0;

      (recentVotesResult.data || []).forEach((vote) => {
        const pollId = Number(vote.poll_id);

        if (validPollIds.has(pollId)) {
          recentCounts[pollId] = (recentCounts[pollId] || 0) + 1;
        }

        const createdAtTime = new Date(vote.created_at).getTime();
        if (!Number.isNaN(createdAtTime) && createdAtTime >= twentyFourHoursAgoMs) {
          last24Total += 1;
        }
      });

      const totalVoteCounts: Record<number, number> = {};
      (optionTotalsResult.data || []).forEach((option) => {
        const pollId = Number(option.poll_id);
        if (!validPollIds.has(pollId)) return;
        totalVoteCounts[pollId] = (totalVoteCounts[pollId] || 0) + (option.vote_count || 0);
      });

      const trendingIds = Object.entries(recentCounts)
        .sort((a, b) => {
          const diff = Number(b[1]) - Number(a[1]);
          if (diff !== 0) return diff;
          return Number(b[0]) - Number(a[0]);
        })
        .slice(0, 5)
        .map(([pollId]) => Number(pollId));

      const popularIds = Object.entries(totalVoteCounts)
        .sort((a, b) => {
          const diff = Number(b[1]) - Number(a[1]);
          if (diff !== 0) return diff;
          return Number(b[0]) - Number(a[0]);
        })
        .slice(0, 10)
        .map(([pollId]) => Number(pollId));

      setRecentVoteCounts(recentCounts);
      setTrendingPollIds(trendingIds);
      setPopularPollIds(popularIds);
      setVotesLast24(last24Total);
    } catch (error) {
      console.error("Homepage vote-derived data query failed", error);
    }
  }, []);

  const loadHomeData = useCallback(async () => {
    setLoading(true);

    try {
          const [pollsResult, totalPollCountResult] = await Promise.all([
        supabase
          .from("polls")
          .select("id, question, description, category, slug, featured, is_private, created_at")
          .eq("is_private", false)
          .order("id", { ascending: false }),
        supabase
          .from("site_stats")
          .select("total_polls")
          .eq("key", "global")
          .single(),
      ]);

      if (pollsResult.error) {
        throw pollsResult.error;
      }

      if (totalPollCountResult.error) {
        throw totalPollCountResult.error;
      }

      const safePolls = (pollsResult.data || []) as Poll[];
      setPolls(safePolls);
       setTotalPollCount(totalPollCountResult.data?.total_polls || 0);

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
        await Promise.all([
          syncTotalVoteCount(),
          syncVoteDerivedData(safePolls),
        ]);
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

      await Promise.all([
        syncTotalVoteCount(),
        syncFeaturedVoteCounts(chosenFeaturedPoll.id),
        syncVoteDerivedData(safePolls),
      ]);
    } catch (error) {
      console.error("Homepage polls query failed", error);
      setPolls([]);
      setTotalPollCount(0);
      setFeaturedOptions([]);
      setFeaturedVoteCounts({});
      setFeaturedPollVoted(false);
      setFeaturedSelectedOptionId(null);
      setTotalVoteCount(0);
      setVotesLast24(0);
      setTrendingPollIds([]);
      setPopularPollIds([]);
      setRecentVoteCounts({});
    } finally {
      setLoading(false);
    }
  }, [syncFeaturedVoteCounts, syncTotalVoteCount, syncVoteDerivedData]);

  useEffect(() => {
    void loadHomeData();
  }, [loadHomeData]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem("homeScrollY", String(window.scrollY));
      const triggerPoint = window.innerWidth < 768 ? 2200 : 1700;
      setShowTopButton(window.scrollY > triggerPoint);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
    const syncNow = () => {
      void syncTotalVoteCount();
      if (featuredPoll?.id) void syncFeaturedVoteCounts(featuredPoll.id);
      if (polls.length > 0) void syncVoteDerivedData(polls);
    };

    syncNow();

    const interval = setInterval(syncNow, 25000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") syncNow();
    };

    const handleFocus = () => syncNow();
    const handlePageShow = () => syncNow();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [featuredPoll?.id, polls, syncFeaturedVoteCounts, syncTotalVoteCount, syncVoteDerivedData]);

  useEffect(() => {
  if (votesLast24 < 100) {
    setShowActivityIndicator(false);
    return;
  }

  if (sessionStorage.getItem("activity_indicator_shown") === "1") {
    return;
  }

  let hideTimeout: ReturnType<typeof setTimeout> | null = null;

  const initialTimeout = setTimeout(() => {
    setShowActivityIndicator(true);
    sessionStorage.setItem("activity_indicator_shown", "1");

    hideTimeout = setTimeout(() => {
      setShowActivityIndicator(false);
    }, 5000);
  }, 5000);

  return () => {
    clearTimeout(initialTimeout);
    if (hideTimeout) clearTimeout(hideTimeout);
  };
}, [votesLast24 >= 100]);
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

  const toggleSubscriberCategory = (category: string) => {
    setSubscriberCategories((current) => {
      if (category === "All Categories") {
        return current.includes("All Categories") ? [] : ["All Categories"];
      }

      if (current.includes("All Categories")) {
        return SIGNUP_CATEGORIES.filter((item) => item !== category);
      }

      const isSelected = current.includes(category);
      const next = isSelected
        ? current.filter((item) => item !== category)
        : [...current, category];

      if (next.length === 0) return ["All Categories"];
      if (next.length === SIGNUP_CATEGORIES.length) return ["All Categories"];
      return next;
    });
  };

  const handleSubscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!subscriberEmail.trim()) {
      setSubscribeError("Enter an email address.");
      setSubscribeMessage("");
      return;
    }

    setSubscribeLoading(true);
    setSubscribeError("");
    setSubscribeMessage("");

    try {
      const selectedPreferences =
        subscriberCategories.includes("All Categories") ? null : subscriberCategories;

      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: subscriberEmail.trim(),
          categoryPreferences: selectedPreferences,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not subscribe right now.");
      }

      localStorage.setItem(POLL_EMAIL_SUBSCRIBED_KEY, "true");
      setSubscribeMessage("Subscribed.");
      setSubscriberEmail("");
      setSubscriberCategories(["All Categories"]);
      setIsCategoryMenuOpen(false);
    } catch (error) {
      setSubscribeError(error instanceof Error ? error.message : "Could not subscribe right now.");
    } finally {
      setSubscribeLoading(false);
    }
  };

  const totalFeaturedVotes = Object.values(featuredVoteCounts).reduce((sum, count) => sum + count, 0);

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
    if (selectedCategory === "All") return polls;
    return polls.filter((poll) => poll.category === selectedCategory);
  }, [polls, selectedCategory]);

  const searchedPolls = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) return filteredPolls;
    return filteredPolls.filter((poll) => poll.question.toLowerCase().includes(trimmed));
  }, [filteredPolls, searchTerm]);

  const livePolls = useMemo(() => {
    return searchedPolls.filter((poll) => poll.id !== featuredPoll?.id);
  }, [searchedPolls, featuredPoll]);

  const trendingPolls = useMemo(() => {
    const pollMap = new Map(polls.map((poll) => [poll.id, poll]));
    return trendingPollIds
      .map((id) => pollMap.get(id))
      .filter((poll): poll is Poll => Boolean(poll))
      .filter((poll) => poll.id !== featuredPoll?.id)
      .slice(0, 4);
  }, [polls, trendingPollIds, featuredPoll?.id]);

  const activePollCount = totalPollCount;
  const trendingIdSet = useMemo(() => new Set(trendingPollIds), [trendingPollIds]);
  const popularIdSet = useMemo(() => new Set(popularPollIds), [popularPollIds]);
  const featuredBadge = featuredPoll ? getBadgeLabel(featuredPoll, trendingIdSet, popularIdSet) : null;

  useEffect(() => {
    if (loading) return;

    const pollsToCache = [featuredPoll, ...livePolls.slice(0, 12)].filter(
      (poll): poll is Poll => Boolean(poll)
    );

    const cachePollBundles = async () => {
      await Promise.all(
        pollsToCache.map(async (poll) => {
          try {
            const { data: optionsData } = await supabase
              .from("poll_options")
              .select("id, poll_id, option_text, vote_count, image_url")
              .eq("poll_id", poll.id)
              .order("id", { ascending: true });

            const options = (optionsData || []) as PollOption[];
            const counts: VoteCounts = {};

            options.forEach((option) => {
              counts[option.id] = option.vote_count || 0;
            });

            setCachedPollBundle({
              poll,
              options,
              voteCounts: counts,
            });
          } catch {
            // ignore cache failures
          }
        })
      );
    };

    const idleWindow = window as IdleWindow;
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleHandle = idleWindow.requestIdleCallback(() => {
        void cachePollBundles();
      });
    } else {
      timeoutHandle = setTimeout(() => {
        void cachePollBundles();
      }, 0);
    }

    return () => {
      if (idleHandle !== null && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }
    };
  }, [loading, featuredPoll, livePolls]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
        <section className="mx-auto max-w-6xl px-6 pb-12 pt-10">
          <div className="animate-pulse">
            <div className="mb-6 h-12 w-48 rounded-xl bg-gray-800" />
            <div className="mb-4 h-6 w-64 rounded bg-gray-800" />
            <div className="mb-10 h-24 w-full rounded-2xl bg-gray-800" />
            <div className="h-72 rounded-2xl bg-gray-800" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <header className="mx-auto max-w-6xl px-4 pb-3 pt-4 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Go to homepage" className="shrink-0">
            <img
              src="/logo.png"
              alt="Poll & See"
              className="block h-12 w-auto object-contain md:h-16"
            />
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border border-gray-700 bg-gray-900 px-3 text-sm font-medium text-white transition hover:bg-gray-800 md:px-5"
            >
              Home
            </Link>

            <Link
              href="/submit-poll"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-500 md:px-5"
            >
              Create Poll
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-6 pt-1">
        <div className="mb-5 text-center">
          <h1 className="mb-2 text-4xl font-bold md:text-5xl">Poll & See</h1>
          <p className="text-lg text-gray-300">See what people really think</p>
          <LiveVoteCounter value={totalVoteCount} />
        </div>

        <div className="mb-6 text-center">
          <p className="text-lg font-medium text-white md:text-xl">
            Real questions. Anonymous opinions.
          </p>
          <p className="mt-2 text-gray-300">
            From everyday dilemmas to testing ideas, create a poll and see what people really think.
          </p>
        </div>

        <div className="relative rounded-2xl bg-gray-800 p-5 shadow-lg overflow-hidden">
          <div className="mb-4 flex items-center justify-between pr-2">
            <span className="-ml-5 inline-flex h-9 items-center rounded-r-full bg-white px-4 text-sm font-semibold tracking-[0.04em] text-black">
              FEATURED POLL
            </span>

            {featuredPoll ? (
              <span className="text-sm text-gray-400">{totalFeaturedVotes} votes</span>
            ) : null}
          </div>

          {featuredPoll ? (
            <>
              
              <div className="mb-3 flex items-center">
  <span
    className="rounded-full px-2 py-1 text-xs"
    style={{
      color: getCategoryColours(featuredPoll.category).text,
      backgroundColor: getCategoryColours(featuredPoll.category).bg,
      border: `1px solid ${getCategoryColours(featuredPoll.category).border}`,
    }}
  >
    {featuredPoll.category}
  </span>

  {featuredBadge ? (
  <span className="ml-auto -mr-6">
    <StatusRibbon label={featuredBadge} />
  </span>
) : null}
</div>

              <h2 className="mb-2 text-2xl font-semibold">{featuredPoll.question}</h2>
              <p className="mb-4 text-gray-300">{featuredPoll.description}</p>

              <div className="mb-5 space-y-2">
                {featuredOptions.map((option, index) => {
                  const count = featuredVoteCounts[option.id] || 0;
                  const percent = totalFeaturedVotes > 0
                    ? Math.round((count / totalFeaturedVotes) * 100)
                    : 0;
                  const isSelected = featuredPollVoted && featuredSelectedOptionId === option.id;
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
                        {option.image_url ? (
                          <div className="mb-3 overflow-hidden rounded-xl bg-gray-900">
                            <img
                              src={option.image_url}
                              alt={option.option_text}
                              loading="lazy"
                              width={1200}
                              height={675}
                              className="h-40 w-full object-cover md:h-48"
                            />
                          </div>
                        ) : null}

                        <div className="grid grid-cols-[1fr_auto] items-start gap-x-3">
                          <div className="flex min-w-0 items-start gap-2">
                            {isSelected ? (
                              <span
                                className="mt-0.5 shrink-0 text-base font-bold"
                                style={{ color: optionColour }}
                              >
                                ✓
                              </span>
                            ) : null}
                            <span className="min-w-0 break-words leading-6 text-white">
                              {option.option_text}
                            </span>
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
                className="inline-block rounded-xl bg-white px-5 py-3 font-medium text-black transition hover:bg-gray-200"
              >
                {featuredPollVoted ? "View poll" : "Vote on featured poll"}
              </Link>
            </>
                    ) : (
            <p className="text-gray-300">No polls found.</p>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-gray-800 p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold">Trending now</h3>
            <span className="inline-block -mr-5 scale-125 origin-right"><StatusRibbon label="Trending" /></span>
          </div>

          {trendingPolls.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {trendingPolls.map((poll) => {
                const categoryColours = getCategoryColours(poll.category);
                const badgeLabel = getBadgeLabel(poll, trendingIdSet, popularIdSet);
                const trendingSectionBadgeLabel = badgeLabel === "Trending" ? null : badgeLabel;

                return (
                  <Link
                    key={poll.id}
                    href={`/poll/${poll.slug}`}
                    onClick={() => handlePollClick(poll)}
                    className="relative overflow-hidden rounded-2xl border border-gray-700 bg-gray-900/60 p-4 transition hover:border-gray-500 md:flex md:min-h-[220px] md:flex-col"
                  >
                
                       <div className="mb-3 flex items-start justify-between gap-3">
                      <span
                        className="rounded-full px-2 py-1 text-xs"
                        style={{
                          color: categoryColours.text,
                          backgroundColor: categoryColours.bg,
                          border: `1px solid ${categoryColours.border}`,
                        }}
                      >
                        {poll.category}
                      </span>

                      <span className="shrink-0 text-sm text-gray-400">
                        {recentVoteCounts[poll.id] || 0} recent votes
                      </span>
                    </div>

                    <h4 className="mb-2 text-lg font-semibold">{poll.question}</h4>
                    <p className="mb-3 text-sm text-gray-300">{poll.description}</p>

                    <div className="flex items-center justify-end gap-1.5 text-sm text-gray-400 md:mt-auto">
                      <span>View poll</span>
                      <span aria-hidden="true" className="text-base leading-none">
                        ›
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-300">No trending polls yet.</p>
          )}
        </div>

                <div className="mt-6 rounded-2xl border border-gray-600 bg-gray-800/80 p-5 md:mx-auto md:max-w-[560px] md:p-6">
          <p className="mb-2 text-base font-medium text-white md:text-lg">See new polls first</p>
          <p className="mb-3 text-sm text-gray-200">
            Get new polls by email based on your interests.
          </p>
          <p className="mb-3 text-sm text-gray-300">Choose categories below. Max 1 email per day. Unsubscribe anytime.</p>

          <form onSubmit={handleSubscribe} className="mt-3 space-y-3">
            <input
              type="email"
              value={subscriberEmail}
              onChange={(event) => setSubscriberEmail(event.target.value)}
              placeholder="Email address"
              required
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500"
            />

            <div ref={categoryMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsCategoryMenuOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 pr-6 text-left text-sm text-white outline-none transition hover:border-gray-500"
              >
                <span className="truncate">{getCategorySummary(subscriberCategories)}</span>
                <span className="ml-4 shrink-0 text-gray-400">▾</span>
              </button>

              {isCategoryMenuOpen ? (
                <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-700 bg-gray-900 p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={() => toggleSubscriberCategory("All Categories")}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-gray-800"
                  >
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-gray-500 text-xs">
                      {subscriberCategories.includes("All Categories") ? "✓" : ""}
                    </span>
                    <span>All Categories</span>
                  </button>

                  <div className="my-1 border-t border-gray-800" />

                  {SIGNUP_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleSubscriberCategory(category)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-gray-800"
                    >
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-gray-500 text-xs">
                        {subscriberCategories.includes("All Categories") ||
                        subscriberCategories.includes(category)
                          ? "✓"
                          : ""}
                      </span>
                      <span>{category}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={subscribeLoading}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-gray-200 disabled:opacity-70"
            >
              {subscribeLoading ? "Subscribing..." : "Subscribe"}
            </button>
          </form>

          {subscribeMessage ? (
            <p className="mt-2 text-sm text-green-300">{subscribeMessage}</p>
          ) : null}

          {subscribeError ? (
            <p className="mt-2 text-sm text-red-300">{subscribeError}</p>
          ) : null}
        </div>
      </section>

      <section id="live-polls" className="mx-auto max-w-6xl scroll-mt-6 px-6 pb-6">
        <div className="mb-5">
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[auto_minmax(240px,380px)_auto] lg:items-center lg:gap-4">
            <h3 className="text-2xl font-semibold">Live Polls</h3>

            <div className="w-full lg:justify-self-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search polls..."
                className="mx-auto h-10 w-full rounded-xl border border-gray-700 bg-gray-800 px-4 text-sm text-white outline-none transition placeholder:text-base placeholder:text-gray-400 focus:border-gray-500"
              />
            </div>

            <span className="text-base font-medium text-gray-300 lg:justify-self-end">
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
              const badgeLabel = getBadgeLabel(poll, trendingIdSet, popularIdSet);

              return (
                <Link
                  key={poll.id}
                  id={`poll-card-${poll.slug}`}
                  href={`/poll/${poll.slug}`}
                  onClick={() => handlePollClick(poll)}
                  className="relative overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 p-5 shadow-lg transition hover:border-gray-500 md:flex md:min-h-[220px] md:flex-col"
                >
                  
                  <div className="mb-3 flex items-center">
  <span
    className="rounded-full px-2 py-1 text-xs"
    style={{
      color: categoryColours.text,
      backgroundColor: categoryColours.bg,
      border: `1px solid ${categoryColours.border}`,
    }}
  >
    {poll.category}
  </span>

  {badgeLabel ? (
  <span className="ml-auto -mr-6">
    <StatusRibbon label={badgeLabel} />
  </span>
) : null}
</div>

                                    <h4 className="mb-2 text-lg font-semibold">{poll.question}</h4>
                  <p className="mb-4 text-sm text-gray-300">{poll.description}</p>

                                    <div className="flex items-center justify-end gap-1.5 text-sm text-gray-400 md:mt-auto">
                    <span>View poll</span>
                    <span aria-hidden="true" className="text-base leading-none">
                      ›
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="relative rounded-2xl border border-gray-700 bg-gray-800 p-6">
            <p className="text-gray-300">No polls found in this category.</p>
          </div>
        )}
      </section>

      <Footer />

      {votesLast24 >= 100 ? (
        <div
          className={`pointer-events-none fixed right-5 top-20 z-40 transition-opacity duration-700 md:left-1/2 md:right-auto md:top-24 md:-translate-x-[-360px] ${
            showActivityIndicator ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="rounded-xl border border-blue-400/50 bg-blue-950/80 px-4 py-3 shadow-[0_0_24px_rgba(59,130,246,0.18)] backdrop-blur md:rounded-2xl md:px-5 md:py-4">
            <p className="text-sm font-medium text-blue-50 md:text-base">
              {votesLast24.toLocaleString()} votes in the last 24 hours
            </p>
          </div>
        </div>
      ) : null}

      {showTopButton && (
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
      )}
    </main>
  );
}