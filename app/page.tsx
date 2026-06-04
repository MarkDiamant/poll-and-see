"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import ActivityIndicator from "@/components/ActivityIndicator";

type Poll = {
  id: number;
  question: string;
  description: string;
  category: string;
  slug: string;
  featured?: boolean;
  is_private?: boolean;
  is_publicly_listed?: boolean;
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
type SortFilter = "Newest" | "Trending" | "Popular";

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

const POLL_BUNDLE_CACHE_PREFIX = "poll-bundle-cache:";
const POLL_EMAIL_SUBSCRIBED_KEY = "poll-email-subscribed";
import {
  LIVE_POLL_CATEGORIES,
  SIGNUP_CATEGORIES,
  getCategoryColours,
  getOptionColour,
} from "@/lib/categories";

const STATUS_RIBBON_COLOURS: Record<BadgeLabel, string> = {
  New: "bg-emerald-600/95",
  Trending: "bg-amber-400/95",
  Popular: "bg-blue-500/95",
};

const SORT_FILTERS: SortFilter[] = ["Newest", "Trending", "Popular"];

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

function clearCachedPollBundles() {
  if (typeof window === "undefined") return;

  try {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith(POLL_BUNDLE_CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
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

  if (poll.created_at) {
    const createdAtTime = new Date(poll.created_at).getTime();
    if (!Number.isNaN(createdAtTime) && createdAtTime >= fortyEightHoursAgo) {
      return "New";
    }
  }

  if (trendingIds.has(poll.id)) {
    return "Trending";
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
  const [totalVoteCountsByPoll, setTotalVoteCountsByPoll] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [featuredPollVoted, setFeaturedPollVoted] = useState(false);
  const [featuredSelectedOptionId, setFeaturedSelectedOptionId] = useState<number | null>(null);
const [selectedCategory, setSelectedCategory] = useState("All");
const [selectedSortFilter, setSelectedSortFilter] = useState<SortFilter>("Newest");
  const [searchTerm, setSearchTerm] = useState("");
  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [subscriberCategories, setSubscriberCategories] = useState<string[]>(["All Categories"]);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [subscribeError, setSubscribeError] = useState("");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [showTopButton, setShowTopButton] = useState(false);
  const [votedPollIds, setVotedPollIds] = useState<number[]>([]);

  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const adminRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setTotalVoteCountsByPoll({});
    setVotesLast24(0);
    return;
  }

  try {
    const validPollIds = new Set(pollList.map((poll) => poll.id));
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgoMs = now.getTime() - 24 * 60 * 60 * 1000;

   const [recentVotesResult, optionTotalsResult] = await Promise.all([
  supabase.rpc("get_recent_poll_votes"),
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

(recentVotesResult.data || []).forEach((row: { poll_id: number | string; recent_votes_48h: number | string | null; recent_votes_24h: number | string | null }) => {
  const pollId = Number(row.poll_id);
  if (!validPollIds.has(pollId)) return;

  recentCounts[pollId] = Number(row.recent_votes_48h || 0);
  last24Total += Number(row.recent_votes_24h || 0);
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
      .slice(0, 8)
      .map(([pollId]) => Number(pollId));

    const popularIds = Object.entries(totalVoteCounts)
      .sort((a, b) => {
        const diff = Number(b[1]) - Number(a[1]);
        if (diff !== 0) return diff;
        return Number(b[0]) - Number(a[0]);
      })
      .slice(0, 8)
      .map(([pollId]) => Number(pollId));

    setRecentVoteCounts(recentCounts);
    setTotalVoteCountsByPoll(totalVoteCounts);
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
          .select("id, question, description, category, slug, featured, is_private, is_publicly_listed, created_at")
          .eq("is_private", false)
          .eq("is_publicly_listed", true)
.order("created_at", { ascending: false }),
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

      const availableCategories = LIVE_POLL_CATEGORIES;

      const params = new URLSearchParams(window.location.search);
      const queryCategory = params.get("category");
      const savedCategory = sessionStorage.getItem("selectedPollCategory");
      const savedSort = sessionStorage.getItem("selectedPollSort") as SortFilter | null;
      const preferredCategory = queryCategory || savedCategory || "All";

if (
  preferredCategory === "All" ||
  availableCategories.includes(preferredCategory as (typeof availableCategories)[number])
) {
  setSelectedCategory(preferredCategory);
} else {
  setSelectedCategory("All");
}

const savedSortFilter = sessionStorage.getItem("selectedPollSortFilter") as SortFilter | null;
if (savedSortFilter && SORT_FILTERS.includes(savedSortFilter)) {
  setSelectedSortFilter(savedSortFilter);
}

if (savedSort && SORT_FILTERS.includes(savedSort)) {
  setSelectedSortFilter(savedSort);
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
      setTotalVoteCountsByPoll({});
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
    const syncVotedPollIds = () => {
      const nextIds: number[] = [];

      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i) || "";
        if (!key.startsWith("poll-voted-")) continue;

        if (localStorage.getItem(key) !== "true") continue;

        const parsed = Number(key.replace("poll-voted-", ""));
        if (!Number.isNaN(parsed)) {
          nextIds.push(parsed);
        }
      }

      setVotedPollIds(nextIds);
    };

    syncVotedPollIds();
    window.addEventListener("focus", syncVotedPollIds);
    window.addEventListener("storage", syncVotedPollIds);

    return () => {
      window.removeEventListener("focus", syncVotedPollIds);
      window.removeEventListener("storage", syncVotedPollIds);
    };
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
    sessionStorage.setItem("selectedPollSortFilter", selectedSortFilter);
  }, [selectedSortFilter]);

  useEffect(() => {
    sessionStorage.setItem("selectedPollSort", selectedSortFilter);
  }, [selectedSortFilter]);

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
    const refreshHomePolls = () => {
      if (adminRefreshTimeoutRef.current) {
        clearTimeout(adminRefreshTimeoutRef.current);
      }

      adminRefreshTimeoutRef.current = setTimeout(() => {
        clearCachedPollBundles();
        void loadHomeData();
      }, 700);
    };

    const channel = supabase
      .channel("homepage-admin-poll-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "polls",
        },
        refreshHomePolls
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poll_options",
        },
        refreshHomePolls
      )
      .subscribe();

    return () => {
      if (adminRefreshTimeoutRef.current) {
        clearTimeout(adminRefreshTimeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [loadHomeData]);
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

          if (typeof newVote.poll_id === "number") {
            setRecentVoteCounts((prev) => ({
              ...prev,
              [newVote.poll_id as number]: (prev[newVote.poll_id as number] || 0) + 1,
            }));

            setVotesLast24((prev) => prev + 1);
          }

          if (
            featuredPoll?.id &&
            newVote.poll_id === featuredPoll.id &&
            typeof newVote.option_id === "number"
          ) {
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
    sessionStorage.setItem("selectedPollSortFilter", selectedSortFilter);
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
      setSubscribeMessage("Done.");
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

   const categories = ["All", ...LIVE_POLL_CATEGORIES];

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
    const basePolls = searchedPolls.filter((poll) => poll.id !== featuredPoll?.id);

   if (selectedSortFilter === "Trending") {
      return [...basePolls].sort((a, b) => {
        const diff = (recentVoteCounts[b.id] || 0) - (recentVoteCounts[a.id] || 0);
        if (diff !== 0) return diff;
        return b.id - a.id;
      });
    }

    if (selectedSortFilter === "Popular") {
      return [...basePolls].sort((a, b) => {
        const diff = (totalVoteCountsByPoll[b.id] || 0) - (totalVoteCountsByPoll[a.id] || 0);
        if (diff !== 0) return diff;
        return b.id - a.id;
      });
    }

    return basePolls;
  }, [searchedPolls, featuredPoll?.id, selectedSortFilter, recentVoteCounts, totalVoteCountsByPoll]);

const trendingPolls = useMemo(() => {
  const pollMap = new Map(polls.map((poll) => [poll.id, poll]));
  return trendingPollIds
    .map((id) => pollMap.get(id))
    .filter((poll): poll is Poll => Boolean(poll))
    .filter((poll) => poll.id !== featuredPoll?.id)
    .slice(0, 4);
}, [polls, trendingPollIds, featuredPoll?.id]);

  const activePollCount =
selectedCategory === "All" && searchTerm.trim() === "" && selectedSortFilter === "Newest"
    ? totalPollCount
    : searchedPolls.length;
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
      <SiteHeader />

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
            Create a poll in seconds, share it, and see results instantly.
          </p>
        </div>

        <div className="relative rounded-2xl bg-gray-800 p-5 shadow-lg overflow-hidden">
          <div className="mb-4 flex items-center justify-between pr-2">
            <span className="-ml-5 inline-flex h-9 items-center rounded-r-full bg-white px-4 text-sm font-semibold tracking-[0.04em] text-black">
              FEATURED POLL
            </span>

            {featuredPoll && totalFeaturedVotes >= 50 ? (
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

              <div className="mb-5 space-y-1.5">
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
    className="rounded-2xl p-2"
    style={{
      border: isSelected ? `2px solid ${optionColour}dd` : "2px solid transparent",
      boxShadow: isSelected ? `0 0 8px ${optionColour}22` : "none",
    }}
  >
                      <div className="px-2.5 pt-1">
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
                         <div className="flex min-w-0 items-center gap-2">
                            {isSelected ? (
                              <span
  className="shrink-0 text-sm font-bold leading-5 sm:text-base"
  style={{ color: optionColour }}
>
                                ✓
                              </span>
                            ) : null}
                            <span className="min-w-0 break-words text-sm leading-5 text-white sm:text-base">
                              {option.option_text}
                            </span>
                          </div>

<span className="shrink-0 whitespace-nowrap text-right text-sm font-semibold text-gray-300">
  {percent}% <span className="font-normal text-gray-400">• {count} votes</span>
</span>
                        </div>
                      </div>

                      <div className="px-2.5 pb-1 pt-0.5">
                        <div className="h-5 w-full overflow-hidden rounded-full bg-gray-700">
  <div
    className="h-5 transition-all"
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
                   className="relative overflow-hidden rounded-2xl border border-gray-700 bg-gray-900/60 p-4 transition hover:border-gray-500 flex min-h-[190px] flex-col justify-between"
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

                      {(recentVoteCounts[poll.id] || 0) >= 50 ? (
  <span className="shrink-0 text-sm text-gray-400">
    {recentVoteCounts[poll.id]} recent votes
  </span>
) : null}
                    </div>

<div className="flex-1 py-2">
  <h4 className="text-left text-lg font-semibold">{poll.question}</h4>
</div>

<div className="flex items-center justify-end gap-1.5 text-sm text-gray-400">
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
          <div className="text-center">
            <p className="mb-2 text-base font-medium text-white md:text-lg">Don’t miss the best polls</p>
            <p className="mb-3 text-sm text-gray-200">
              Get interesting polls sent to you (max once per day)
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="mt-3 space-y-3">
            <input
              type="email"
              value={subscriberEmail}
              onChange={(event) => setSubscriberEmail(event.target.value)}
              placeholder="Email address"
              required
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500"
            />

<button
  type="submit"
  disabled={subscribeLoading}
className="mx-auto block w-[68%] md:w-[55%] cursor-pointer rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-black transition hover:bg-white disabled:opacity-70"
>
              {subscribeLoading ? "Sending..." : "Get polls"}
            </button>

            <p className="text-center text-xs text-gray-400">No spam. Unsubscribe anytime.</p>
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

<p className="mt-4 mb-2 text-xs text-gray-400 uppercase tracking-wide text-center">Categories</p>
<div className="flex flex-wrap justify-center gap-2 lg:grid lg:grid-cols-10">
            {categories.map((category, index) => {
              const isActive = selectedCategory === category;

              const categoryColours = getCategoryColours(category);

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryChange(category)}
className="h-10 min-w-[88px] cursor-pointer rounded-xl px-3 text-sm font-medium transition lg:min-w-0 lg:w-full"
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

<p className="mt-4 mb-2 text-xs text-gray-400 uppercase tracking-wide text-center">
  Sort by
</p>
<div className="grid grid-cols-3 gap-2 sm:flex sm:justify-center">
            {SORT_FILTERS.map((filter) => {
              const isActive = selectedSortFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedSortFilter(filter)}
className={`h-8 cursor-pointer rounded-lg border px-3 text-xs font-medium transition ${
  isActive
    ? "border-gray-400 bg-gray-200 text-black"
    : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:bg-gray-800"
}`}
                >
                  {filter}
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
                  className="relative overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 p-4 shadow-lg transition hover:border-gray-500 flex min-h-[190px] flex-col justify-between"
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

<div className="flex-1 py-2">
  <h4 className="text-left text-lg font-semibold">{poll.question}</h4>
</div>

<div className="flex items-center justify-between gap-3">
                    <div className="text-xs">
  {votedPollIds.includes(poll.id) ? (
    <span className="flex items-center gap-1 text-green-400">
      <span>✓</span>
      <span className="text-gray-400">Voted</span>
    </span>
  ) : null}
</div>

                    <div className="flex items-center gap-1.5 text-sm text-gray-400">
                      <span>View poll</span>
                      <span aria-hidden="true" className="text-base leading-none">
                        ›
                      </span>
                    </div>
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

      <ActivityIndicator votesLast24={votesLast24} />

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