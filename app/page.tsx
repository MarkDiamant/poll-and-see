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

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

const POLL_BUNDLE_CACHE_PREFIX = "poll-bundle-cache:";
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
  if (selected.length === 0 || selected.includes("All polls")) {
    return "All polls";
  }

  if (selected.length <= 2) {
    return selected.join(", ");
  }

  return `${selected.length} categories selected`;
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
  const [featuredOptions, setFeaturedOptions] = useState<PollOption[]>([]);
  const [featuredVoteCounts, setFeaturedVoteCounts] = useState<Record<number, number>>({});
  const [totalVoteCount, setTotalVoteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [featuredPollVoted, setFeaturedPollVoted] = useState(false);
  const [featuredSelectedOptionId, setFeaturedSelectedOptionId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [subscriberCategories, setSubscriberCategories] = useState<string[]>(["All polls"]);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [subscribeError, setSubscribeError] = useState("");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [showTopButton, setShowTopButton] = useState(false);

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

  const loadHomeData = useCallback(async () => {
    setLoading(true);

    try {
      const pollsResult = await supabase
        .from("polls")
        .select("id, question, description, category, slug, featured, is_private")
        .eq("is_private", false)
        .order("id", { ascending: false });

      if (pollsResult.error) {
        throw pollsResult.error;
      }

      const safePolls = (pollsResult.data || []) as Poll[];
      setPolls(safePolls);

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
        await syncTotalVoteCount();
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
      ]);
    } catch (error) {
      console.error("Homepage polls query failed", error);
      setPolls([]);
      setFeaturedOptions([]);
      setFeaturedVoteCounts({});
      setFeaturedPollVoted(false);
      setFeaturedSelectedOptionId(null);
      setTotalVoteCount(0);
    } finally {
      setLoading(false);
    }
  }, [syncFeaturedVoteCounts, syncTotalVoteCount]);

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
    };

    syncNow();

    const interval = setInterval(syncNow, 5000);

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
  }, [featuredPoll?.id, syncFeaturedVoteCounts, syncTotalVoteCount]);

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
      if (category === "All polls") {
        return current.includes("All polls") ? [] : ["All polls"];
      }

      if (current.includes("All polls")) {
        return SIGNUP_CATEGORIES.filter((item) => item !== category);
      }

      const isSelected = current.includes(category);
      const next = isSelected
        ? current.filter((item) => item !== category)
        : [...current, category];

      if (next.length === 0) return ["All polls"];
      if (next.length === SIGNUP_CATEGORIES.length) return ["All polls"];
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
        subscriberCategories.includes("All polls") ? null : subscriberCategories;

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

      setSubscribeMessage("Subscribed.");
      setSubscriberEmail("");
      setSubscriberCategories(["All polls"]);
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

  const activePollCount = searchedPolls.length;

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
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="h-72 rounded-2xl bg-gray-800 lg:col-span-2" />
              <div className="h-72 rounded-2xl bg-gray-800" />
            </div>
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

      <section className="mx-auto max-w-6xl px-6 pb-6 pt-1">
        <div className="mb-5 text-center">
          <h1 className="mb-2 text-4xl font-bold md:text-5xl">Poll & See</h1>
          <p className="text-lg text-gray-300">See what people really think</p>
          <LiveVoteCounter value={totalVoteCount} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-gray-800 p-5 shadow-lg lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-300">
                Featured Poll
              </span>

              {featuredPoll ? (
                <span className="text-sm text-gray-400">{totalFeaturedVotes} votes</span>
              ) : null}
            </div>

            {featuredPoll ? (
              <>
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

          <div className="flex flex-col justify-center rounded-2xl bg-gray-800 p-5 shadow-lg">
            <p className="mb-3 text-gray-300">
              Vote on real questions. Compare your answer. See how others think.
            </p>

            <p className="mb-3 text-gray-300">
              From everyday opinions to testing ideas, create a poll and see what people really think.
            </p>

            <div className="mb-3 rounded-xl border border-gray-700 bg-gray-900/60 p-3">
              <p className="mb-1 text-sm font-medium text-white">Get new polls by email</p>
              <p className="mb-3 text-xs text-gray-400">Max once per day. Unsubscribe anytime.</p>

              <form onSubmit={handleSubscribe} className="space-y-3">
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
                        onClick={() => toggleSubscriberCategory("All polls")}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-gray-800"
                      >
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-gray-500 text-xs">
                          {subscriberCategories.includes("All polls") ? "✓" : ""}
                        </span>
                        <span>All polls</span>
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
                            {subscriberCategories.includes("All polls") ||
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
          </div>
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

              return (
                <Link
                  key={poll.id}
                  id={`poll-card-${poll.slug}`}
                  href={`/poll/${poll.slug}`}
                  onClick={() => handlePollClick(poll)}
                  className="rounded-2xl border border-gray-700 bg-gray-800 p-5 shadow-lg transition hover:border-gray-500"
                >
                  <div className="mb-3">
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
                  </div>

                  <h4 className="mb-2 text-lg font-semibold">{poll.question}</h4>
                  <p className="mb-4 text-sm text-gray-300">{poll.description}</p>

                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>View poll</span>
                    <span>→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6">
            <p className="text-gray-300">No polls found in this category.</p>
          </div>
        )}
      </section>

      <Footer />

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