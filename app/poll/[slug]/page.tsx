"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import { buildShareResultsImageFile } from "@/lib/buildShareResultsImage";
import ActivityIndicator from "@/components/ActivityIndicator";

type Poll = {
  id: number;
  question: string;
  description: string;
  category: string;
  slug: string;
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

type VoteCounts = Record<number, number>;
type BadgeLabel = "New" | "Trending" | "Popular" | "Private";

type PollBundle = {
  poll: Poll;
  options: PollOption[];
  voteCounts: VoteCounts;
};

type Sponsor = {
  id: number;
  business_name: string;
  headline: string;
  logo_url: string | null;
  cta_text: string;
  destination_url: string;
  theme: string | null;
};

const OPTION_COLOURS = ["#2563eb", "#22c55e", "#fbbf24", "#f97316", "#8b5cf6", "#14b8a6", "#ef4444", "#06b6d4"];
const SAME_POLL_CLICK_GUARD_MS = 400;
const MAX_LOCAL_VOTES_PER_POLL = 4;
const POLL_BUNDLE_CACHE_PREFIX = "poll-bundle-cache:";
const PRELOAD_QUEUE_LIMIT = 30;
const INLINE_SUBSCRIBE_VOTE_THRESHOLD = 3;
const INLINE_SUBSCRIBE_VOTE_COUNT_KEY = "poll-flow-vote-count";
const INLINE_SUBSCRIBE_SHOWN_KEY = "poll-flow-inline-subscribe-shown";
const POLL_FLOW_COUNTED_VOTE_PREFIX = "poll-flow-counted-vote-";
const POLL_EMAIL_SUBSCRIBED_KEY = "poll-email-subscribed";
const SPONSOR_FREQUENCY = 2;
const FIRST_VOTE_SPONSOR_SHOWN_KEY = "first-vote-sponsor-shown";

const CREATE_POLL_PROMPTS = [
  "Got a better question?",
  "What would your friends say?",
  "Want to test something?",
  "Got something to ask?",
  "Curious what people would say?",
  "Got an interesting thought?",
];

function getRandomCreatePollPrompt() {
  return CREATE_POLL_PROMPTS[Math.floor(Math.random() * CREATE_POLL_PROMPTS.length)];
}

const SIGNUP_CATEGORIES = [
  "Business",
  "Community",
  "Education",
  "Finance",
  "Fun",
  "General",
  "Lifestyle",
  "Politics",
  "Sports",
];

const RELATED_CATEGORY_ORDER: Record<string, string[]> = {
  Community: ["Lifestyle", "General", "Education", "Fun", "Politics", "Finance", "Business", "Sports"],
  Lifestyle: ["Community", "General", "Fun", "Finance", "Sports", "Education", "Business", "Politics"],
  General: ["Community", "Lifestyle", "Fun", "Education", "Politics", "Finance", "Business", "Sports"],
  Fun: ["General", "Lifestyle", "Community", "Sports", "Education", "Finance", "Business", "Politics"],
  Finance: ["Business", "Lifestyle", "General", "Community", "Politics", "Education", "Fun", "Sports"],
  Business: ["Finance", "Community", "General", "Politics", "Lifestyle", "Education", "Fun", "Sports"],
  Education: ["Community", "Lifestyle", "General", "Fun", "Politics", "Finance", "Business", "Sports"],
  Sports: ["Community", "Fun", "General", "Lifestyle", "Education", "Business", "Finance", "Politics"],
  Politics: ["Community", "General", "Business", "Finance", "Education", "Lifestyle", "Fun", "Sports"],
};

const CATEGORY_COLOURS: Record<string, { text: string; bg: string; border: string; solid: string }> = {
  All: { text: "#e5e7eb", bg: "rgba(31, 41, 55, 0.9)", border: "rgba(75, 85, 99, 1)", solid: "#374151" },
  Business: { text: "#93c5fd", bg: "rgba(37, 99, 235, 0.12)", border: "rgba(37, 99, 235, 0.55)", solid: "#2563eb" },
  Community: { text: "#fca5a5", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.55)", solid: "#ef4444" },
  Education: { text: "#fde68a", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.55)", solid: "#f59e0b" },
  Finance: { text: "#86efac", bg: "rgba(34, 197, 94, 0.12)", border: "rgba(34, 197, 94, 0.55)", solid: "#22c55e" },
  Fun: { text: "#f9a8d4", bg: "rgba(236, 72, 153, 0.12)", border: "rgba(236, 72, 153, 0.55)", solid: "#ec4899" },
  General: { text: "#67e8f9", bg: "rgba(6, 182, 212, 0.12)", border: "rgba(6, 182, 212, 0.55)", solid: "#06b6d4" },
  Lifestyle: { text: "#d8b4fe", bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.55)", solid: "#a855f7" },
  Health: { text: "#fdba74", bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.55)", solid: "#f97316" },
  Politics: { text: "#fdba74", bg: "rgba(234, 88, 12, 0.12)", border: "rgba(234, 88, 12, 0.55)", solid: "#ea580c" },
  Sports: { text: "#f87171", bg: "rgba(185, 28, 28, 0.14)", border: "rgba(185, 28, 28, 0.65)", solid: "#b91c1c" },
  Tech: { text: "#f9a8d4", bg: "rgba(217, 70, 239, 0.12)", border: "rgba(217, 70, 239, 0.55)", solid: "#d946ef" },
};

const FALLBACK_CATEGORY_COLOURS = [
  { text: "#93c5fd", bg: "rgba(37, 99, 235, 0.12)", border: "rgba(37, 99, 235, 0.55)", solid: "#2563eb" },
  { text: "#fca5a5", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.55)", solid: "#ef4444" },
  { text: "#fde68a", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.55)", solid: "#f59e0b" },
  { text: "#86efac", bg: "rgba(34, 197, 94, 0.12)", border: "rgba(34, 197, 94, 0.55)", solid: "#22c55e" },
  { text: "#67e8f9", bg: "rgba(6, 182, 212, 0.12)", border: "rgba(6, 182, 212, 0.55)", solid: "#06b6d4" },
  { text: "#d8b4fe", bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.55)", solid: "#a855f7" },
  { text: "#fdba74", bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.55)", solid: "#f97316" },
  { text: "#fdba74", bg: "rgba(234, 88, 12, 0.12)", border: "rgba(234, 88, 12, 0.55)", solid: "#ea580c" },
  { text: "#f87171", bg: "rgba(185, 28, 28, 0.14)", border: "rgba(185, 28, 28, 0.65)", solid: "#b91c1c" },
  { text: "#f9a8d4", bg: "rgba(217, 70, 239, 0.12)", border: "rgba(217, 70, 239, 0.55)", solid: "#d946ef" },
];

const STATUS_RIBBON_COLOURS: Record<BadgeLabel, string> = {
  New: "bg-emerald-600/95",
  Trending: "bg-amber-400/95",
  Popular: "bg-blue-500/95",
  Private: "bg-slate-500/95",
};

function getCategoryColours(category: string) {
  const trimmed = category?.trim();
  if (!trimmed) return CATEGORY_COLOURS.All;
  if (CATEGORY_COLOURS[trimmed]) return CATEGORY_COLOURS[trimmed];
  let hash = 0;
  for (let i = 0; i < trimmed.length; i += 1) hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
  return FALLBACK_CATEGORY_COLOURS[Math.abs(hash) % FALLBACK_CATEGORY_COLOURS.length];
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

function getPriorityCategories(anchorCategory: string) {
  const related = RELATED_CATEGORY_ORDER[anchorCategory] || [];
  return [anchorCategory, ...related];
}

function getGroupedRemainingPolls(remaining: Poll[]) {
  const categoryOrder: string[] = [];
  const pollsByCategory = new Map<string, Poll[]>();

  for (const poll of remaining) {
    if (!pollsByCategory.has(poll.category)) {
      pollsByCategory.set(poll.category, []);
      categoryOrder.push(poll.category);
    }

    pollsByCategory.get(poll.category)!.push(poll);
  }

  return categoryOrder.flatMap((category) => pollsByCategory.get(category) || []);
}

function canVoteNow(pollId: number): string | null {
  const last = Number(localStorage.getItem(`poll-last-click-${pollId}`) || 0);
  if (Date.now() - last < SAME_POLL_CLICK_GUARD_MS) return "Please try again.";
  return null;
}

function recordVoteClient(pollId: number) {
  localStorage.setItem(`poll-last-click-${pollId}`, String(Date.now()));
}

function getPollVotedKey(pollId: number) {
  return `poll-voted-${pollId}`;
}

function getPollSelectedOldKey(pollId: number) {
  return `poll-selected-option-${pollId}`;
}

function getPollSelectedNewKey(pollId: number) {
  return `poll-selected-${pollId}`;
}

function getPollVotedAtKey(pollId: number) {
  return `poll-voted-at-${pollId}`;
}

function getPollLocalVoteCountKey(pollId: number) {
  return `poll-local-vote-count-${pollId}`;
}

function getPollFlowAnchorCategoryKey(slug: string) {
  return `poll-flow-anchor-category-${slug}`;
}

function getPollFlowCountedVoteKey(pollId: number) {
  return `${POLL_FLOW_COUNTED_VOTE_PREFIX}${pollId}`;
}

function hasLocalVote(pollId: number): boolean {
  if (typeof window === "undefined") return false;

  const count = Number(localStorage.getItem(getPollLocalVoteCountKey(pollId)) || 0);

  return (
    count >= MAX_LOCAL_VOTES_PER_POLL ||
    localStorage.getItem(getPollVotedKey(pollId)) === "true" ||
    localStorage.getItem(getPollSelectedOldKey(pollId)) !== null ||
    localStorage.getItem(getPollSelectedNewKey(pollId)) !== null
  );
}

function getLocalSelectedOption(pollId: number): number | null {
  if (typeof window === "undefined") return null;
  const raw =
    localStorage.getItem(getPollSelectedNewKey(pollId)) ||
    localStorage.getItem(getPollSelectedOldKey(pollId));
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

function markPollVotedLocally(pollId: number, optionId: number | null) {
  const voteKey = getPollVotedKey(pollId);

  // 🔒 prevent double-application of local vote
  if (localStorage.getItem(voteKey) === "true") {
    return;
  }

  localStorage.setItem(voteKey, "true");
  localStorage.setItem(getPollVotedAtKey(pollId), String(Date.now()));

  if (optionId !== null) {
    localStorage.setItem(getPollSelectedNewKey(pollId), String(optionId));
    localStorage.setItem(getPollSelectedOldKey(pollId), String(optionId));
  }
}

function getCachedPollBundle(slug: string): PollBundle | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(`${POLL_BUNDLE_CACHE_PREFIX}${slug}`);
    if (!raw) return null;
    return JSON.parse(raw) as PollBundle;
  } catch {
    return null;
  }
}

function setCachedPollBundle(bundle: PollBundle) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(`${POLL_BUNDLE_CACHE_PREFIX}${bundle.poll.slug}`, JSON.stringify(bundle));
  } catch {
    // ignore cache failures
  }
}

function getInlineSubscribeVoteCount() {
  if (typeof window === "undefined") return 0;
  const raw = sessionStorage.getItem(INLINE_SUBSCRIBE_VOTE_COUNT_KEY);
  const parsed = Number(raw || 0);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function recordInlineSubscribeVote(pollId: number) {
  if (typeof window === "undefined") return 0;

  const countedKey = getPollFlowCountedVoteKey(pollId);
  if (sessionStorage.getItem(countedKey) === "true") {
    return getInlineSubscribeVoteCount();
  }

  sessionStorage.setItem(countedKey, "true");
  const next = getInlineSubscribeVoteCount() + 1;
  sessionStorage.setItem(INLINE_SUBSCRIBE_VOTE_COUNT_KEY, String(next));
  return next;
}

function hasShownInlineSubscribeThisSession() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(INLINE_SUBSCRIBE_SHOWN_KEY) === "true";
}

function markInlineSubscribeShownThisSession() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(INLINE_SUBSCRIBE_SHOWN_KEY, "true");
}

function hasEmailSubscribedLocally() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(POLL_EMAIL_SUBSCRIBED_KEY) === "true";
}

function markEmailSubscribedLocally() {
  if (typeof window === "undefined") return;
  localStorage.setItem(POLL_EMAIL_SUBSCRIBED_KEY, "true");
}

function getBadgeLabel(
  poll: Poll,
  trendingIds: Set<number>,
  popularIds: Set<number>
): BadgeLabel | null {
  const now = Date.now();
  const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;

  if (poll.is_private) {
    return "Private";
  }

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
      style={{ paddingTop: label === "Trending" ? "2px" : label === "Private" ? "2px" : "1px" }}
    >
      {label.toUpperCase()}
    </span>
  );
}

function smoothScrollToElement(element: HTMLElement, duration = 650, topOffset?: number) {
  const startY = window.scrollY;

  // 👇 key change: place element higher in viewport (not at top)
  const elementTop = element.getBoundingClientRect().top + window.scrollY;

  // show it around upper-middle of screen
  const targetY =
  typeof topOffset === "number"
    ? elementTop - topOffset
    : elementTop - window.innerHeight * 0.35;

  const distance = targetY - startY;
  const startTime = performance.now();

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(progress);

    window.scrollTo(0, startY + distance * eased);

    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  }

  window.requestAnimationFrame(step);
}

async function submitVote(pollId: number, optionId: number) {
  const response = await fetch("/api/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pollId, optionId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Vote failed");
  }
}

async function loadActiveSponsor(category: string): Promise<Sponsor | null> {
  const response = await fetch(`/api/sponsors/active?category=${encodeURIComponent(category)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.sponsor || null;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;

    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return [text];
  }

  const rebuilt = lines.join(" ");
  if (rebuilt.length < text.trim().length) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.length > 2 ? `${last.slice(0, -1)}…` : `${last}…`;
  }

  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function loadLogoImage() {
  return await new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `${window.location.origin}/logo.png`;
  });
}

async function shareImageFile(file: File, text: string) {
  if (
    navigator.share &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      files: [file],
      text,
    });
    return "shared";
  }

  const objectUrl = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);

  try {
    await navigator.clipboard.writeText(text);
    return "downloaded_and_copied";
  } catch {
    return "downloaded";
  }
}

function ResultOptions({
  options,
  voteCounts,
  selectedOptionId,
}: {
  options: PollOption[];
  voteCounts: VoteCounts;
  selectedOptionId: number | null;
}) {
  const total = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-2">
      {options.map((option, index) => {
        const count = voteCounts[option.id] || 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        const colour = OPTION_COLOURS[index] || OPTION_COLOURS[0];
        const isSelected = selectedOptionId === option.id;

        return (
          <div
            key={option.id}
            className={option.image_url ? "rounded-xl md:max-w-[480px]" : "rounded-xl"}
            style={{
  border: isSelected ? `2px solid ${colour}cc` : "2px solid transparent",
boxShadow: isSelected ? `0 0 8px ${colour}22` : "none",
}}
          >
            <div className="px-3 pt-2">
              {option.image_url ? (
                <div className="mb-3 overflow-hidden rounded-xl bg-gray-900 md:max-w-[480px]">
                  <img
                    src={option.image_url}
                    alt={option.option_text}
                    loading="lazy"
                    width={1200}
                    height={675}
                    className="aspect-square h-auto w-full object-contain"
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-[1fr_auto] items-start gap-x-3">
                <div className="flex min-w-0 items-center gap-2">
                  {isSelected ? (
                   <span className="shrink-0 text-sm font-bold leading-5 text-white sm:text-base" style={{ color: colour }}>
                      ✓
                    </span>
                  ) : null}
                 <span className="min-w-0 break-words text-sm leading-5 text-white sm:text-base">{option.option_text}</span>
                </div>
                <span className="shrink-0 whitespace-nowrap text-right text-sm font-semibold text-gray-300">
                  {percent}%
                </span>
              </div>
            </div>

            <div className="px-3 pb-2 pt-1">
              <div className="h-5 w-full overflow-hidden rounded-full bg-gray-700">
  <div
    className="h-5 transition-all"
    style={{ width: `${percent}%`, backgroundColor: colour, opacity: 0.96 }}
  />
</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getSponsorTheme(theme: string | null) {
  const themes: Record<string, { card: string; cta: string; label: string }> = {
    default: {
      card: "border-gray-500/40 bg-[#0b1220]/95",
      cta: "border-gray-600 bg-gray-800 text-gray-100",
      label: "text-gray-500",
    },
    slate: {
      card: "border-slate-600/60 bg-slate-900/95",
      cta: "border-slate-500/70 bg-slate-800 text-slate-100",
      label: "text-slate-400",
    },
    navy: {
      card: "border-blue-900/70 bg-[#071526]",
      cta: "border-blue-800/80 bg-[#10233a] text-blue-100",
      label: "text-blue-300/70",
    },
    charcoal: {
      card: "border-zinc-700/70 bg-zinc-900/95",
      cta: "border-zinc-600 bg-zinc-800 text-zinc-100",
      label: "text-zinc-400",
    },
    green: {
      card: "border-emerald-900/60 bg-[#071b16]",
      cta: "border-emerald-800/70 bg-[#102820] text-emerald-100",
      label: "text-emerald-300/70",
    },
    blue: {
      card: "border-sky-900/60 bg-[#071827]",
      cta: "border-sky-800/70 bg-[#102538] text-sky-100",
      label: "text-sky-300/70",
    },
    cream: {
      card: "border-stone-600/60 bg-[#191714]",
      cta: "border-stone-500/70 bg-[#2a251f] text-stone-100",
      label: "text-stone-300/70",
    },
    warm: {
      card: "border-stone-600/60 bg-[#191714]",
      cta: "border-stone-500/70 bg-[#2a251f] text-stone-100",
      label: "text-stone-300/70",
    },
    purple: {
      card: "border-purple-900/60 bg-[#160d24]",
      cta: "border-purple-800/70 bg-[#241633] text-purple-100",
      label: "text-purple-300/70",
    },
  };

  return themes[theme || "default"] || themes.default;
}

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const imageUrl = sponsor.logo_url?.trim() || null;

  return (
    <a
      href={sponsor.destination_url}
      target="_blank"
      rel="noreferrer sponsored"
      className="relative mb-4 block overflow-hidden rounded-xl border border-gray-600/40 bg-gray-800/40 p-4 transition hover:opacity-95"
    >
      {/* LEFT ACCENT BAR */}
      <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-amber-400/70 via-amber-500/40 to-transparent" />
      <div className="relative flex items-start justify-between gap-3 pl-2">

        {/* LEFT TEXT */}
        <div className="flex-1 min-w-0 pr-3">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">
            Sponsored
          </p>

          <p className="text-base font-semibold text-white leading-snug break-words">
            {sponsor.business_name}
          </p>

          <p className="mt-1 text-[15px] text-gray-300 leading-relaxed break-words">
            {sponsor.headline}
          </p>
        </div>

        {/* RIGHT: LOGO + CTA */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">

          {imageUrl ? (
            <img
              src={imageUrl}
              alt={sponsor.business_name}
              className="h-20 w-auto object-contain"
              loading="lazy"
            />
          ) : null}

          <button
            type="button"
            className="rounded-lg bg-gray-700 px-3 py-2 text-xs font-medium text-white hover:bg-gray-600"
          >
            {sponsor.cta_text}
          </button>

        </div>

      </div>
    </a>
  );
}

function PollCard({
  bundle,
  badgeLabel,
    showGoToAllPolls,
  onVoteComplete,
  onSkipPoll,
  isFollowOnPoll,
  totalVoteCount,
}: {
  bundle: PollBundle;
  badgeLabel: BadgeLabel | null;
  showGoToAllPolls: boolean;
  onVoteComplete: (pollId: number, category: string) => void;
  onSkipPoll: (pollId: number) => void;
  isFollowOnPoll: boolean;
  totalVoteCount: number;
}) {
  const [voted, setVoted] = useState<boolean>(false);
  const [counts, setCounts] = useState<VoteCounts>(bundle.voteCounts);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [shareButtonText, setShareButtonText] = useState("Share");
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareMenuDirection, setShareMenuDirection] = useState<"up" | "down">("up");
  const shareMenuRef = useRef<HTMLDivElement | null>(null);

  const totalVotes = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const voteLabel = `${totalVotes.toLocaleString()} ${totalVotes === 1 ? "vote" : "votes"}`;
  const categoryColours = getCategoryColours(bundle.poll.category);
  const hasImageOptions = bundle.options.some((option) => Boolean(option.image_url));

  useEffect(() => {
    const votedLocally = hasLocalVote(bundle.poll.id);
    const selectedLocally = getLocalSelectedOption(bundle.poll.id);

    setVoted(votedLocally);
    setSelected(selectedLocally);

    setCounts(() => {
  // 🔒 always trust server snapshot first to avoid stacking duplicates
  return bundle.voteCounts;
});

    setError("");
    setShareButtonText("Share");
    setShareMenuOpen(false);
  }, [bundle]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShareMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

 const shareLinkText = bundle.poll.is_private
  ? `PRIVATE POLL\n\n${bundle.poll.question}\n\n${window.location.origin}/poll/${bundle.poll.slug}`
  : `${bundle.poll.question}\n\n${window.location.origin}/poll/${bundle.poll.slug}`;
  const shareImageLinkText = `${window.location.origin}/poll/${bundle.poll.slug}`;
  const toggleShareMenu = () => {
    if (!shareMenuOpen && shareMenuRef.current) {
      const rect = shareMenuRef.current.getBoundingClientRect();
      const estimatedMenuHeight = 152;
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      if (spaceAbove >= estimatedMenuHeight || spaceAbove > spaceBelow) {
        setShareMenuDirection("up");
      } else {
        setShareMenuDirection("down");
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          shareMenuRef.current?.scrollIntoView({
            block: "nearest",
            behavior: "smooth",
          });
        });
      });
    }

    setShareMenuOpen((current) => !current);
  };
  const handleSharePollLink = async () => {
    setShareMenuOpen(false);

    if (navigator.share) {
      try {
        await navigator.share({
          text: shareLinkText,
        });
        return;
      } catch {
        // fall through
      }
    }

    try {
      await navigator.clipboard.writeText(shareLinkText);
      setShareButtonText("Link copied");
      setTimeout(() => setShareButtonText("Share"), 2000);
    } catch {
      setShareButtonText("Share");
    }
  };

  const handleShareResults = async () => {
    setShareMenuOpen(false);

    try {
const file = await buildShareResultsImageFile({
        poll: bundle.poll,
        options: bundle.options,
        voteCounts: counts,
      });

      if (!file) {
        setShareButtonText("Share");
        return;
      }

      const result = await shareImageFile(file, shareImageLinkText);

      if (result === "downloaded_and_copied") {
        setShareButtonText("Image saved + link copied");
      } else if (result === "downloaded") {
        setShareButtonText("Image saved");
      } else {
        setShareButtonText("Share");
      }

      if (result !== "shared") {
        setTimeout(() => setShareButtonText("Share"), 2200);
      }
    } catch {
      setShareButtonText("Share");
    }
  };

const handleVote = async (optionId: number) => {
  const cooldownError = canVoteNow(bundle.poll.id);
  if (cooldownError) {
    setError(cooldownError);
    return;
  }

  if (voted) {
    setSelected(optionId);
    return;
  }

  setError("");

  const previousCounts = counts;
  const previousSelected = selected;
  const previousVoted = voted;

  setVoted(true);
  setSelected(optionId);

  // 🔒 FIX: prevent vote inflation (single controlled increment only)
  setCounts(() => {
    const base = { ...bundle.voteCounts };
    base[optionId] = (base[optionId] || 0) + 1;
    return base;
  });

  markPollVotedLocally(bundle.poll.id, optionId);

  try {
    await submitVote(bundle.poll.id, optionId);
    recordVoteClient(bundle.poll.id);
    onVoteComplete(bundle.poll.id, bundle.poll.category);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not submit vote.";
    const lower = message.toLowerCase();

    if (lower.includes("already voted")) {
      markPollVotedLocally(bundle.poll.id, optionId);
      setError("");
      setVoted(true);
      setSelected(optionId);
      onVoteComplete(bundle.poll.id, bundle.poll.category);
      return;
    }

    localStorage.removeItem(getPollVotedKey(bundle.poll.id));
    localStorage.removeItem(getPollSelectedOldKey(bundle.poll.id));
    localStorage.removeItem(getPollSelectedNewKey(bundle.poll.id));

    setCounts(previousCounts);
    setSelected(previousSelected);
    setVoted(previousVoted);

    const hiddenErrors = [
      "too many votes from this network",
      "too many votes from this network on this poll",
      "too many votes",
      "network limit",
    ];

    const shouldHide = hiddenErrors.some((e) =>
      message.toLowerCase().includes(e)
    );

    if (!shouldHide) return;

    setError(message);
  }
};

  return (
   <div className="relative mb-4 overflow-visible rounded-2xl border border-gray-700 bg-gray-900/80 p-6">
      <div className="mb-3 flex items-center gap-3">
        <span
          className="rounded-full px-3 py-1 text-xs"
          style={{
            color: categoryColours.text,
            backgroundColor: categoryColours.bg,
            border: `1px solid ${categoryColours.border}`,
          }}
        >
          {bundle.poll.category}
        </span>

        <span className="ml-auto text-sm text-gray-400">
          {voteLabel}
        </span>

        {badgeLabel ? (
          <span className="-mr-7 shrink-0">
            <StatusRibbon label={badgeLabel} />
          </span>
        ) : null}
      </div>

      <h2 className="mb-2 text-2xl font-bold">{bundle.poll.question}</h2>

      {bundle.poll.is_private ? (
        <p className="mb-3 text-sm text-gray-400">Shared via private link only</p>
      ) : null}

      <p className="mb-3 text-gray-300">{bundle.poll.description}</p>

      {!voted ? (
        <div className="flex flex-col gap-3">
          {hasImageOptions ? (
            <p className="mb-[8px] mt-[6px] text-sm text-gray-300 opacity-80">
              Tap an image to vote
            </p>
          ) : null}

          {bundle.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              className={
                option.image_url
                  ? "cursor-pointer overflow-hidden rounded-xl bg-gray-700 text-left text-white transition hover:bg-gray-600 md:max-w-[480px]"
                  : "cursor-pointer overflow-hidden rounded-xl bg-gray-700 text-left text-white transition hover:bg-gray-600"
              }
            >
              {option.image_url ? (
                <div className="overflow-hidden bg-gray-900">
                  <img
                    src={option.image_url}
                    alt={option.option_text}
                    loading="lazy"
                    width={1200}
                    height={675}
                    className="aspect-square h-auto w-full object-contain"
                  />
                </div>
              ) : null}
              <div className="px-4 py-3.5">{option.option_text}</div>
            </button>
          ))}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <div className="flex items-center justify-between pt-1">
            {isFollowOnPoll ? (
              <button
                type="button"
                onClick={() => onSkipPoll(bundle.poll.id)}
                className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-gray-400 transition hover:text-white"
              >
                <span>See another poll</span>
                <span aria-hidden="true" className="relative top-[1px] sm:-top-[1px] text-sm leading-none">›</span>
              </button>
            ) : (
              <span />
            )}

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition hover:text-white"
            >
              <span>Home</span>
              <span aria-hidden="true" className="relative top-[1px] sm:-top-[1px] text-sm leading-none">›</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ResultOptions options={bundle.options} voteCounts={counts} selectedOptionId={selected} />
          <p className="pt-4 text-sm text-gray-400">
            Your vote is part of {totalVoteCount.toLocaleString()} total votes across all polls.
          </p>

          <div className="mt-6">
            <div className="grid grid-cols-2 gap-2">
              <div ref={shareMenuRef} className="relative">
                <button
                 onClick={toggleShareMenu}
                  className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-xl bg-white px-3 py-0 text-sm font-medium leading-none text-black transition hover:bg-gray-200"
                >
                  {shareButtonText}
                </button>

                {shareMenuOpen ? (
  <div
    className={`absolute left-0 z-50 w-full min-w-[220px] overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl ${
      shareMenuDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"
    }`}
  >
    <button
      type="button"
      onClick={handleSharePollLink}
      className="block w-full px-4 py-3 text-left text-sm text-white transition hover:bg-gray-800"
    >
      Share poll link
    </button>
    <button
      type="button"
        onClick={() => void handleShareResults()}
      className="block w-full border-t border-gray-800 px-4 py-3 text-left text-sm text-white transition hover:bg-gray-800"
    >
          Share results
    </button>
  </div>
) : null}
              </div>

              {showGoToAllPolls ? (
                <Link
                  href="/#live-polls"
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-gray-700 bg-gray-900 px-3 py-0 text-sm font-medium leading-none text-white transition hover:bg-gray-800"
                >
                  All polls
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function PollPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params.slug);

  const [polls, setPolls] = useState<PollBundle[]>([]);
  const [showInlineSubscribe, setShowInlineSubscribe] = useState(false);
  const [inlineSubscribeAfterPollId, setInlineSubscribeAfterPollId] = useState<number | null>(null);
  const [trendingPollIds, setTrendingPollIds] = useState<number[]>([]);
  const [popularPollIds, setPopularPollIds] = useState<number[]>([]);
  const [votesLast24, setVotesLast24] = useState(0);
  const [showEndOfFeed, setShowEndOfFeed] = useState(false);
  const [sponsorByPollId, setSponsorByPollId] = useState<Record<number, Sponsor>>({});

  const pollRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const inlineSubscribeBoxRef = useRef<HTMLDivElement | null>(null);
  const endOfFeedRef = useRef<HTMLElement | null>(null);
  const sponsorRef = useRef<HTMLDivElement | null>(null);
const sponsorByPollContainerRef = useRef<Record<number, HTMLDivElement | null>>({});
  const previousPollCountRef = useRef(0);
  const previousShowInlineSubscribeRef = useRef(false);
  const preloadedQueueRef = useRef<PollBundle[]>([]);
  const pollsRef = useRef<PollBundle[]>([]);
  const skippedPollIdsRef = useRef<Set<number>>(new Set());

  const [subscriberEmail, setSubscriberEmail] = useState("");
  const [subscriberCategories, setSubscriberCategories] = useState<string[]>(["All Categories"]);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [subscribeError, setSubscribeError] = useState("");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [totalVoteCount, setTotalVoteCount] = useState(0);
  const [anchorCategory, setAnchorCategory] = useState("");

  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const adminRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pollsRef.current = polls;
  }, [polls]);

  useEffect(() => {
    if (
      !hasEmailSubscribedLocally() &&
      !hasShownInlineSubscribeThisSession() &&
      getInlineSubscribeVoteCount() >= INLINE_SUBSCRIBE_VOTE_THRESHOLD
    ) {
      markInlineSubscribeShownThisSession();
      setShowInlineSubscribe(true);
    }
  }, []);

  const trendingIdSet = new Set(trendingPollIds);
  const popularIdSet = new Set(popularPollIds);

  const syncVoteDerivedData = useCallback(async () => {
    try {
     
const [recentVotesResult, optionTotalsResult] = await Promise.all([
        supabase.rpc("get_recent_poll_votes"),
        supabase
          .from("poll_options")
          .select("poll_id, vote_count"),
      ]);

      if (recentVotesResult.error) {
        console.error("Poll page recent votes query failed", recentVotesResult.error);
      }

      if (optionTotalsResult.error) {
        console.error("Poll page option totals query failed", optionTotalsResult.error);
      }

      const recentCounts: Record<number, number> = {};
      let last24Total = 0;

(recentVotesResult.data || []).forEach((row: { poll_id: number | string; recent_votes_48h: number | string | null; recent_votes_24h: number | string | null }) => {
        const pollId = Number(row.poll_id);

        recentCounts[pollId] = Number(row.recent_votes_48h || 0);
        last24Total += Number(row.recent_votes_24h || 0);
      });

      const totalVoteCounts: Record<number, number> = {};
      (optionTotalsResult.data || []).forEach((option) => {
        const pollId = Number(option.poll_id);
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

      setTrendingPollIds(trendingIds);
      setPopularPollIds(popularIds);
      setVotesLast24(last24Total);
    } catch (error) {
      console.error("Poll page vote-derived data query failed", error);
    }
  }, []);

  const syncTotalVoteCount = async () => {
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
  };

  const syncDisplayedPolls = async () => {
    try {
      const currentPolls = pollsRef.current;
      if (currentPolls.length === 0) return;

      const refreshed = await Promise.all(
        currentPolls.map(async (bundle) => {
          const { data, error } = await supabase
            .from("poll_options")
            .select("id, poll_id, option_text, vote_count, image_url")
            .eq("poll_id", bundle.poll.id)
            .order("id", { ascending: true });

          if (error || !data) {
            return bundle;
          }

          const options = data as PollOption[];
          const voteCounts: VoteCounts = {};
          const hasVotedLocally = hasLocalVote(bundle.poll.id);

          options.forEach((option) => {
            const serverCount = option.vote_count || 0;
            const currentCount = bundle.voteCounts[option.id] || 0;
            voteCounts[option.id] = hasVotedLocally ? Math.max(serverCount, currentCount) : serverCount;
          });

          const nextBundle = {
            ...bundle,
            options,
            voteCounts,
          };

          setCachedPollBundle(nextBundle);
          return nextBundle;
        })
      );

      setPolls(refreshed);
    } catch {
      // ignore sync failures
    }
  };

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
    const loadTotalVoteCount = async () => {
      try {
        const { data, error } = await supabase
          .from("site_stats")
          .select("total_votes")
          .eq("key", "global")
          .single();

        if (error) {
          console.error("Poll page total vote count query failed", error);
          return;
        }

        setTotalVoteCount(data?.total_votes || 0);
      } catch (error) {
        console.error("Poll page total vote count query failed", error);
      }
    };

    void loadTotalVoteCount();
    void syncVoteDerivedData();

    const channel = supabase
      .channel("poll-page-live-total-votes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
        },
        () => {
          setTotalVoteCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncVoteDerivedData]);

  useEffect(() => {
    const syncNow = () => {
      void syncTotalVoteCount();
      void syncDisplayedPolls();
      void syncVoteDerivedData();
    };

    syncNow();

    const interval = setInterval(syncNow, 25000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncNow();
      }
    };

    const handleFocus = () => {
      syncNow();
    };

    const handlePageShow = () => {
      syncNow();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [syncVoteDerivedData]);

  const handleBack = () => {
    sessionStorage.setItem("restoreHomeScroll", "true");
    router.push("/");
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

      if (next.length === 0) {
        return ["All Categories"];
      }

      if (next.length === SIGNUP_CATEGORIES.length) {
        return ["All Categories"];
      }

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

      markEmailSubscribedLocally();
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
  const loadBundleBySlug = async (pollSlug: string): Promise<PollBundle> => {
    const response = await fetch(`/api/polls/${encodeURIComponent(pollSlug)}`, {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Poll not found");
    }

    const options = (data.options || []) as PollOption[];
    const counts: VoteCounts = {};

    options.forEach((option) => {
      counts[option.id] = option.vote_count || 0;
    });

    const bundle = {
      poll: data.poll as Poll,
      options,
      voteCounts: counts,
    };

const safeBundle = {
  ...bundle,
  voteCounts: { ...bundle.voteCounts },
};

// 🔒 ensure no external mutation leaks into cache/state
setCachedPollBundle(safeBundle);
return safeBundle;
  };
  const loadBundle = async (pollId: number): Promise<PollBundle> => {
    const [pollResult, optionsResult] = await Promise.all([
      supabase
        .from("polls")
        .select("id, question, description, category, slug, is_private, created_at")
        .eq("id", pollId)
        .single(),
      supabase
        .from("poll_options")
        .select("id, poll_id, option_text, vote_count, image_url")
        .eq("poll_id", pollId)
        .order("id", { ascending: true }),
    ]);

    if (pollResult.error || !pollResult.data) {
      throw pollResult.error || new Error("Poll not found");
    }

    if (optionsResult.error) {
      throw optionsResult.error;
    }

    const options = (optionsResult.data || []) as PollOption[];
    const counts: VoteCounts = {};

    options.forEach((option) => {
      counts[option.id] = option.vote_count || 0;
    });

    const bundle = {
      poll: pollResult.data as Poll,
      options,
      voteCounts: counts,
    };

    setCachedPollBundle(bundle);
    return bundle;
  };

    const refreshVisiblePollBundles = useCallback(async () => {
    const currentPolls = pollsRef.current;
    if (currentPolls.length === 0) return;

    const refreshed = await Promise.all(
      currentPolls.map(async (bundle) => {
        try {
          return await loadBundle(bundle.poll.id);
        } catch {
          return bundle;
        }
      })
    );

    setPolls((current) => {
  const map = new Map<number, PollBundle>();

  // preserve newest UI state first (optimistic wins)
  for (const item of current) {
    map.set(item.poll.id, item);
  }

  for (const refreshedItem of refreshed) {
    const existing = map.get(refreshedItem.poll.id);

    map.set(refreshedItem.poll.id, {
      ...refreshedItem,
      voteCounts: {
        ...refreshedItem.voteCounts,
        // 🔒 never overwrite higher optimistic UI values
        ...existing?.voteCounts,
      },
    });
  }

  return Array.from(map.values());
});
  }, []);

  useEffect(() => {
    const refreshPollPageAfterAdminUpdate = () => {
      if (adminRefreshTimeoutRef.current) {
        clearTimeout(adminRefreshTimeoutRef.current);
      }

      adminRefreshTimeoutRef.current = setTimeout(() => {
        void refreshVisiblePollBundles();
      }, 700);
    };

    const channel = supabase
      .channel("poll-page-admin-poll-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "polls",
        },
        refreshPollPageAfterAdminUpdate
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poll_options",
        },
        refreshPollPageAfterAdminUpdate
      )
      .subscribe();

    return () => {
      if (adminRefreshTimeoutRef.current) {
        clearTimeout(adminRefreshTimeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [refreshVisiblePollBundles]);

  const preloadQueue = async (excludeIds: number[], flowAnchorCategory: string) => {
    try {
      const { data, error } = await supabase
        .from("polls")
.select("id, question, description, category, slug, is_private, created_at")
.eq("is_private", false)
.eq("is_publicly_listed", true)
.order("id", { ascending: false });

      if (error) {
        console.error("Poll page preload poll list query failed", error);
        preloadedQueueRef.current = [];
        return;
      }

      const pollList = (data || []) as Poll[];
            const unseen = pollList.filter(
        (poll) =>
          !excludeIds.includes(poll.id) &&
          !skippedPollIdsRef.current.has(poll.id) &&
          !hasLocalVote(poll.id)
      );

      const priorityCategories = getPriorityCategories(flowAnchorCategory);
      const ordered: Poll[] = [];
      const usedPollIds = new Set<number>();

      for (const category of priorityCategories) {
        const matches = unseen.filter((poll) => poll.category === category);
        for (const poll of matches) {
          if (!usedPollIds.has(poll.id)) {
            ordered.push(poll);
            usedPollIds.add(poll.id);
          }
        }
      }

      const remaining = unseen.filter((poll) => !usedPollIds.has(poll.id));
      const groupedRemaining = getGroupedRemainingPolls(remaining);
      ordered.push(...groupedRemaining);

      const limitedPolls = ordered.slice(0, PRELOAD_QUEUE_LIMIT);
      const bundleResults = await Promise.allSettled(limitedPolls.map((poll) => loadBundle(poll.id)));

      preloadedQueueRef.current = bundleResults
        .filter((result): result is PromiseFulfilledResult<PollBundle> => result.status === "fulfilled")
        .map((result) => result.value);
    } catch (error) {
      console.error("Poll page preload queue failed", error);
      preloadedQueueRef.current = [];
    }
  };

  useEffect(() => {
     const init = async () => {
      setShowEndOfFeed(false);

      const cached = getCachedPollBundle(slug);
      if (cached) {
        setPolls([cached]);
      }

      try {
        const firstBundle = await loadBundleBySlug(slug);

        const storedAnchorCategory = sessionStorage.getItem(getPollFlowAnchorCategoryKey(slug));
        const resolvedAnchorCategory = storedAnchorCategory || firstBundle.poll.category;

        setAnchorCategory(resolvedAnchorCategory);
        sessionStorage.setItem(getPollFlowAnchorCategoryKey(slug), resolvedAnchorCategory);
        const firstPollAlreadyVoted = hasLocalVote(firstBundle.poll.id);

        setPolls([firstBundle]);

        await preloadQueue([firstBundle.poll.id], resolvedAnchorCategory);

        if (firstPollAlreadyVoted) {
          if (preloadedQueueRef.current.length > 0) {
            const next = preloadedQueueRef.current.shift();

            if (next && !hasLocalVote(next.poll.id)) {
              setPolls([firstBundle, next]);
              setShowEndOfFeed(false);
              return;
            }
          }

          setShowEndOfFeed(true);
        }
      } catch (error) {
        console.error("Poll page init failed", error);
      }
    };

    void init();
  }, [slug]);

  const inlineSubscribeInsertAfterIndex = inlineSubscribeAfterPollId
    ? polls.findIndex((poll) => poll.poll.id === inlineSubscribeAfterPollId)
    : -1;

  useEffect(() => {
    const inlineSubscribeJustOpened = showInlineSubscribe && !previousShowInlineSubscribeRef.current;

    if (inlineSubscribeJustOpened && inlineSubscribeBoxRef.current) {
      smoothScrollToElement(inlineSubscribeBoxRef.current, 650, 8);
      previousShowInlineSubscribeRef.current = showInlineSubscribe;
      previousPollCountRef.current = polls.length;
      return;
    }

    if (showEndOfFeed && endOfFeedRef.current) {
smoothScrollToElement(endOfFeedRef.current, 650, window.innerHeight * 0.62);
  previousShowInlineSubscribeRef.current = showInlineSubscribe;
  previousPollCountRef.current = polls.length;
  return;
}

if (polls.length > previousPollCountRef.current && polls.length > 1) {
  const lastPollId = polls[polls.length - 1]?.poll.id;

  if (!lastPollId) return;

  const sponsorEl = sponsorByPollContainerRef.current[lastPollId];
  const pollEl = pollRefs.current[lastPollId];

  const target = sponsorEl || pollEl;

  if (target) {
    smoothScrollToElement(target as HTMLElement, 650, 8);
  }
}

    previousShowInlineSubscribeRef.current = showInlineSubscribe;
    previousPollCountRef.current = polls.length;
    }, [polls, showInlineSubscribe, showEndOfFeed]);

  const handleVoteComplete = async (pollId: number, category: string) => {
const countedVotes = recordInlineSubscribeVote(pollId);

const hasShownFirstSponsor =
  sessionStorage.getItem(FIRST_VOTE_SPONSOR_SHOWN_KEY) === "true";

const adjustedVoteCount = countedVotes + 1;

const shouldShowSponsor =
  adjustedVoteCount >= 1 &&
  adjustedVoteCount % SPONSOR_FREQUENCY === 1;

if (shouldShowSponsor) {
  sessionStorage.setItem(FIRST_VOTE_SPONSOR_SHOWN_KEY, "true");

  const sponsor = await loadActiveSponsor(category);

  if (sponsor) {
    setSponsorByPollId((current) => ({
      ...current,
      [pollId]: sponsor,
    }));
  }
}


    if (
      countedVotes >= INLINE_SUBSCRIBE_VOTE_THRESHOLD &&
      !hasEmailSubscribedLocally() &&
      !hasShownInlineSubscribeThisSession()
    ) {
      markInlineSubscribeShownThisSession();
      setInlineSubscribeAfterPollId(pollId);
      setShowInlineSubscribe(true);
    }

    const currentShownIds = pollsRef.current.map((item) => item.poll.id);
    const flowAnchorCategory = anchorCategory || pollsRef.current[0]?.poll.category || "";

    while (preloadedQueueRef.current.length > 0) {
      const next = preloadedQueueRef.current.shift();
      if (!next) break;
      if (currentShownIds.includes(next.poll.id)) continue;
      if (hasLocalVote(next.poll.id)) continue;

      setShowEndOfFeed(false);

setPolls((current) => {
  // 🔒 prevent stale preload overriding fresh visible poll state
  const exists = current.some((item) => item.poll.id === next.poll.id);
  if (exists) return current;

  return [
    ...current,
    {
      ...next,
      voteCounts: { ...next.voteCounts }, // isolate snapshot
    },
  ];
});

      return;
    }

await preloadQueue([...currentShownIds, pollId], flowAnchorCategory);

while (preloadedQueueRef.current.length > 0) {
  const next = preloadedQueueRef.current.shift();
  if (!next) break;
  if (currentShownIds.includes(next.poll.id)) continue;
  if (hasLocalVote(next.poll.id)) continue;

  setShowEndOfFeed(false);

  setPolls((current) => {
    if (current.some((item) => item.poll.id === next.poll.id)) return current;
    return [...current, next];
  });

  return;
}

setShowEndOfFeed(true);
};

  const handleSkipPoll = async (pollId: number) => {
    skippedPollIdsRef.current.add(pollId);

    const currentShownIds = pollsRef.current.map((item) => item.poll.id);
    const flowAnchorCategory = anchorCategory || pollsRef.current[0]?.poll.category || "";

    while (preloadedQueueRef.current.length > 0) {
      const next = preloadedQueueRef.current.shift();
      if (!next) break;
      if (currentShownIds.includes(next.poll.id)) continue;
      if (skippedPollIdsRef.current.has(next.poll.id)) continue;
      if (hasLocalVote(next.poll.id)) continue;

       setShowEndOfFeed(false);

      setPolls((current) => {
        const withoutSkipped = current.filter((item) => item.poll.id !== pollId);
        if (withoutSkipped.some((item) => item.poll.id === next.poll.id)) return withoutSkipped;
        return [...withoutSkipped, next];
      });

      return;
    }

      await preloadQueue(
      [...currentShownIds, pollId, ...Array.from(skippedPollIdsRef.current)],
      flowAnchorCategory
    );

    while (preloadedQueueRef.current.length > 0) {
      const next = preloadedQueueRef.current.shift();
      if (!next) break;
      if (currentShownIds.includes(next.poll.id)) continue;
      if (skippedPollIdsRef.current.has(next.poll.id)) continue;
      if (hasLocalVote(next.poll.id)) continue;

      setShowEndOfFeed(false);

      setPolls((current) => {
        const withoutSkipped = current.filter((item) => item.poll.id !== pollId);
        if (withoutSkipped.some((item) => item.poll.id === next.poll.id)) return withoutSkipped;
        return [...withoutSkipped, next];
      });

      return;
    }

    await preloadQueue(
      [...currentShownIds, pollId, ...Array.from(skippedPollIdsRef.current)],
      flowAnchorCategory
    );

    while (preloadedQueueRef.current.length > 0) {
      const next = preloadedQueueRef.current.shift();
      if (!next) break;
      if (currentShownIds.includes(next.poll.id)) continue;
      if (skippedPollIdsRef.current.has(next.poll.id)) continue;
      if (hasLocalVote(next.poll.id)) continue;

      setShowEndOfFeed(false);

      setPolls((current) => {
        const withoutSkipped = current.filter((item) => item.poll.id !== pollId);
        if (withoutSkipped.some((item) => item.poll.id === next.poll.id)) return withoutSkipped;
        return [...withoutSkipped, next];
      });

      return;
    }

    setPolls((current) => current.filter((item) => item.poll.id !== pollId));
    setShowEndOfFeed(true);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 pt-2 pb-8">
        <button
          type="button"
          onClick={handleBack}
          className="mb-5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-gray-300 transition hover:text-white"
        >
          <span aria-hidden="true" className="text-base leading-none">‹</span>
          <span>Back to polls</span>
        </button>

        {polls.map((bundle, index) => {
          const badgeLabel = getBadgeLabel(bundle.poll, trendingIdSet, popularIdSet);

          return (
            <div
              key={bundle.poll.id}
              ref={(el) => {
                pollRefs.current[bundle.poll.id] = el;
              }}
            >
              <PollCard
                bundle={bundle}
                badgeLabel={badgeLabel}
                showGoToAllPolls={true}
                onVoteComplete={(pollId, category) => {
                  void handleVoteComplete(pollId, category);
                }}
                onSkipPoll={(pollId) => {
                  void handleSkipPoll(pollId);
                }}
                isFollowOnPoll={index > 0}
                totalVoteCount={totalVoteCount}
              />

              {sponsorByPollId[bundle.poll.id] ? (
                <SponsorCard sponsor={sponsorByPollId[bundle.poll.id]} />
              ) : null}

              {showInlineSubscribe &&
              (index === inlineSubscribeInsertAfterIndex ||
                (inlineSubscribeInsertAfterIndex === -1 && index === polls.length - 1)) ? (
                <div ref={inlineSubscribeBoxRef} className="mb-8 mt-4 flex justify-center">
                  <div className="w-full max-w-md rounded-2xl border border-gray-600 bg-gray-800/80 p-5 md:p-6">
                    <div className="text-center">
                      <p className="mb-1 text-sm text-gray-400">Enjoying this?</p>
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
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500"
                      />

 <button
  type="submit"
  disabled={subscribeLoading}
className="mx-auto block w-[68%] md:w-[55%] cursor-pointer rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-black transition hover:bg-white disabled:opacity-70"
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
                </div>
              ) : null}

   {index > 0 && (index + 1) % 5 === 0 ? (
  <div className="mb-8 mt-4 flex justify-center">
   <div className="w-full max-w-md rounded-2xl border border-blue-500/40 bg-gray-800/80 p-5 text-center shadow-[0_0_20px_rgba(59,130,246,0.1)]">
      
      <p className="mb-3 text-base font-medium text-white">
        {CREATE_POLL_PROMPTS[Math.floor(index / 5) % CREATE_POLL_PROMPTS.length]}
      </p>

      <Link
        href="/submit-poll"
        className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
      >
        Create your own poll in seconds
      </Link>

    </div>
  </div>
) : null}
            </div>
          );
        })}
      </section>

{showEndOfFeed ? (
<section ref={endOfFeedRef} className="mx-auto max-w-3xl px-6 pb-12">
   <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-6 text-center">
            <p className="mb-5 text-base font-medium text-white">
              You’ve voted on all live polls.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/results"
               className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-gray-200"
              >
                View your results
              </Link>

              <Link
                href="/"
               className="inline-flex items-center justify-center rounded-xl border border-gray-700 bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Go to home
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <div className="-mt-8">
        <Footer />
      </div>

           <ActivityIndicator votesLast24={votesLast24} />
    </main>
  );
}
