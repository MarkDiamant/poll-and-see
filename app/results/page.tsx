"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import LiveVoteCounter from "@/components/LiveVoteCounter";

type Poll = {
  id: number;
  question: string;
  description: string | null;
  category: string;
  slug: string;
  is_private: boolean | null;
  is_publicly_listed: boolean | null;
  total_votes?: number | null;
};

type PollOption = {
  id: number;
  poll_id: number;
  option_text: string;
  vote_count: number;
  image_url?: string | null;
};

type VoteCounts = Record<number, number>;
type ReactionType = "surprising" | "agree" | "funny";
type ReactionCounts = Record<ReactionType, number>;

type PollBundle = {
  poll: Poll;
  options: PollOption[];
  voteCounts: VoteCounts;
  selectedOptionId: number | null;
  votedAt: number;
};

const OPTION_COLOURS = ["#2563eb", "#22c55e", "#fbbf24", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#ef4444"];
const RESULTS_BROWSER_ID_KEY = "pollandsee-results-browser-id";

const RESULTS_CREATE_POLL_PROMPTS = [
  "Curious what others think about yours?",
  "Want to ask your own question?",
  "Got something people would vote on?",
  "Try your own poll",
];

function getRandomResultsCreatePollPrompt() {
  return RESULTS_CREATE_POLL_PROMPTS[Math.floor(Math.random() * RESULTS_CREATE_POLL_PROMPTS.length)];
}

const REACTIONS: Array<{ type: ReactionType; emoji: string; label: string }> = [
  { type: "surprising", emoji: "😮", label: "Surprising" },
  { type: "agree", emoji: "👍", label: "Agree" },
  { type: "funny", emoji: "😂", label: "Funny" },
];

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
  Politics: { text: "#fcd34d", bg: "rgba(234, 179, 8, 0.12)", border: "rgba(234, 179, 8, 0.55)", solid: "#eab308" },
  Sport: { text: "#c4b5fd", bg: "rgba(139, 92, 246, 0.12)", border: "rgba(139, 92, 246, 0.55)", solid: "#8b5cf6" },
  Sports: { text: "#c4b5fd", bg: "rgba(139, 92, 246, 0.12)", border: "rgba(139, 92, 246, 0.55)", solid: "#8b5cf6" },
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
  { text: "#fcd34d", bg: "rgba(234, 179, 8, 0.12)", border: "rgba(234, 179, 8, 0.55)", solid: "#eab308" },
  { text: "#c4b5fd", bg: "rgba(139, 92, 246, 0.12)", border: "rgba(139, 92, 246, 0.55)", solid: "#8b5cf6" },
  { text: "#f9a8d4", bg: "rgba(217, 70, 239, 0.12)", border: "rgba(217, 70, 239, 0.55)", solid: "#d946ef" },
];

function getCategoryColours(category: string) {
  const trimmed = category?.trim();
  if (!trimmed) return CATEGORY_COLOURS.All;
  if (CATEGORY_COLOURS[trimmed]) return CATEGORY_COLOURS[trimmed];

  let hash = 0;
  for (let i = 0; i < trimmed.length; i += 1) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
  }

  return FALLBACK_CATEGORY_COLOURS[Math.abs(hash) % FALLBACK_CATEGORY_COLOURS.length];
}

function getEmptyReactionCounts(): ReactionCounts {
  return {
    surprising: 0,
    agree: 0,
    funny: 0,
  };
}

function getResultsBrowserId() {
  if (typeof window === "undefined") return "";

  const existing = localStorage.getItem(RESULTS_BROWSER_ID_KEY);
  if (existing) return existing;

  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(RESULTS_BROWSER_ID_KEY, next);
  return next;
}

function getShareText(poll: Poll) {
  return `${poll.question}\n\n${window.location.origin}/poll/${poll.slug}`;
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

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
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

  if (lines.length === 0) return [text];

  const rebuilt = lines.join(" ");
  if (rebuilt.length < text.trim().length) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.length > 2 ? `${last.slice(0, -1)}…` : `${last}…`;
  }

  return lines;
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

async function buildResultsShareFile(bundle: PollBundle) {
  const canvas = document.createElement("canvas");
  canvas.width = 680;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const totalVotes = Object.values(bundle.voteCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const logo = await loadLogoImage();
  const colours = getCategoryColours(bundle.poll.category);

  ctx.font = "700 42px Arial";
  const questionLines = wrapCanvasText(
    ctx,
    bundle.poll.question,
    470,
    6
  );

  const questionHeight = questionLines.length * 56;
  const getShareOptionHeight = (option: PollOption) => option.image_url ? 290 : 136;
  const optionsHeight = bundle.options.reduce((sum, option) => sum + getShareOptionHeight(option), 0);
  const footerHeight = 240;

  const cardHeight =
    180 +
    questionHeight +
    optionsHeight +
    footerHeight;

  canvas.height = cardHeight;

  drawRoundedRect(ctx, 0, 0, canvas.width, canvas.height, 28);
  ctx.fillStyle = "#111827";
  ctx.fill();

  drawRoundedRect(ctx, 60, 60, 150, 40, 18);

  ctx.fillStyle = colours.bg;
  ctx.fill();

  ctx.strokeStyle = colours.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "600 20px Arial";
  ctx.fillStyle = colours.text;
  ctx.textBaseline = "middle";

  ctx.fillText(
    bundle.poll.category,
    82,
    80
  );

  ctx.textAlign = "right";

  ctx.font = "700 28px Arial";
  ctx.fillStyle =
    "rgba(255,255,255,0.88)";

  ctx.fillText(
    `${totalVotes.toLocaleString()} votes`,
    600,
    80
  );

  ctx.textAlign = "left";

  ctx.font = "700 42px Arial";
  ctx.fillStyle = "#ffffff";

  let y = 140;

  questionLines.forEach(line => {
    ctx.fillText(
      line,
      60,
      y
    );

    y += 56;
  });

  y += 24;

  const barWidth = 430;

  for (const [i, opt] of bundle.options.entries()) {
    const votes =
      bundle.voteCounts[opt.id] || 0;

    const pct =
      totalVotes > 0
        ? Math.round(
            (votes / totalVotes) * 100
          )
        : 0;

    const colour =
      OPTION_COLOURS[i] ||
      OPTION_COLOURS[0];

    const optionHeight = opt.image_url ? 290 : 136;

    ctx.fillStyle =
      "rgba(255,255,255,0.05)";

    drawRoundedRect(
      ctx,
      46,
      y,
      588,
      optionHeight - 34,
      20
    );

    ctx.fill();

    let contentY = y + 24;

    if (opt.image_url) {
      const image = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = opt.image_url as string;
      });

      if (image) {
        const imageX = 64;
        const imageY = y + 18;
        const imageSize = 120;

        ctx.save();
        drawRoundedRect(ctx, imageX, imageY, imageSize, imageSize, 16);
        ctx.clip();

        const imageRatio = image.width / image.height;
        let drawWidth = imageSize;
        let drawHeight = imageSize;
        let drawX = imageX;
        let drawY = imageY;

        if (imageRatio > 1) {
          drawWidth = imageSize * imageRatio;
          drawX = imageX - (drawWidth - imageSize) / 2;
        } else {
          drawHeight = imageSize / imageRatio;
          drawY = imageY - (drawHeight - imageSize) / 2;
        }

        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
      }

      contentY = y + 160;
    }

    ctx.font =
      "600 26px Arial";

    ctx.fillStyle =
      "#ffffff";

    ctx.fillText(
      opt.option_text,
      64,
      contentY + 18
    );

    ctx.textAlign = "right";

    ctx.font =
      "700 28px Arial";

    ctx.fillText(
      `${pct}% • ${votes.toLocaleString()} ${votes === 1 ? "vote" : "votes"}`,
      612,
      contentY + 24
    );

    ctx.textAlign = "left";

    ctx.fillStyle =
      "rgba(255,255,255,0.12)";

    drawRoundedRect(
      ctx,
      64,
      contentY + 48,
      barWidth,
      14,
      8
    );

    ctx.fill();

    const fill =
      pct > 0
        ? Math.max(
            (barWidth * pct) / 100,
            10
          )
        : 0;

    ctx.fillStyle = colour;

    drawRoundedRect(
      ctx,
      64,
      contentY + 48,
      fill,
      14,
      8
    );

    ctx.fill();

    y += optionHeight;
  }

  y += 50;

  if (logo) {
    ctx.globalAlpha = 0.9;

    const logoWidth = 210;
    const logoHeight = logoWidth * (logo.height / logo.width);
    const logoX = (canvas.width - logoWidth) / 2;

    ctx.drawImage(
      logo,
      logoX,
      y,
      logoWidth,
      logoHeight
    );

    ctx.globalAlpha = 1;
  }

  y += 95;

  ctx.textAlign = "center";

  ctx.font =
    "400 24px Arial";

  ctx.fillStyle =
    "rgba(255,255,255,0.75)";

  ctx.fillText(
    "Vote and see what others think:",
    340,
    y
  );

  y += 34;

  ctx.font =
    "600 26px Arial";

  ctx.fillStyle =
    "rgba(255,255,255,0.6)";

  ctx.fillText(
    "pollandsee.com",
    340,
    y
  );

  const blob =
    await new Promise<Blob | null>(
      resolve => {
        canvas.toBlob(
          b => resolve(b),
          "image/png"
        );
      }
    );

  if (!blob) return null;

  return new File(
    [blob],
    `pollandsee-results-${bundle.poll.slug}.png`,
    { type: "image/png" }
  );
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
                    <span className="shrink-0 text-sm font-bold leading-5 sm:text-base" style={{ color: colour }}>
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

function ResultCard({
  bundle,
  reactionCounts,
  selectedReaction,
  onReaction,
}: {
  bundle: PollBundle;
  reactionCounts: ReactionCounts;
  selectedReaction: ReactionType | null;
  onReaction: (pollId: number, reactionType: ReactionType) => void;
}) {
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareButtonText, setShareButtonText] = useState("Share");
  const shareMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShareMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleShare = async () => {
    const text = getShareText(bundle.poll);

    if (navigator.share) {
      try {
        await navigator.share({ text });
        setShareMenuOpen(false);
        return;
      } catch {
        // fall through
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setShareButtonText("Copied");
      setShareMenuOpen(false);
      window.setTimeout(() => setShareButtonText("Share"), 1600);
    } catch {
      setShareButtonText("Share");
    }
  };

  const handleShareResults = async () => {
    const text = `${window.location.origin}/poll/${bundle.poll.slug}`;
    setShareMenuOpen(false);

    try {
      const file = await buildResultsShareFile(bundle);
      if (!file) return;

      const result = await shareImageFile(file, text);

      if (result === "downloaded_and_copied") {
        setShareButtonText("Image saved + link copied");
      } else if (result === "downloaded") {
        setShareButtonText("Image saved");
      } else {
        setShareButtonText("Share");
      }

      if (result !== "shared") {
        window.setTimeout(() => setShareButtonText("Share"), 2200);
      }
    } catch {
      setShareButtonText("Share");
    }
  };

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className="rounded-full px-2 py-1 text-xs"
          style={{
            color: getCategoryColours(bundle.poll.category).text,
            backgroundColor: getCategoryColours(bundle.poll.category).bg,
            border: `1px solid ${getCategoryColours(bundle.poll.category).border}`,
          }}
        >
          {bundle.poll.category}
        </span>

        <span className="text-sm text-gray-400">
          {Object.values(bundle.voteCounts).reduce((sum, count) => sum + count, 0)} votes
        </span>
      </div>

      <h2 className="mb-2 text-2xl font-bold">{bundle.poll.question}</h2>

      {bundle.poll.description ? (
        <p className="mb-4 text-gray-300">{bundle.poll.description}</p>
      ) : null}

      <ResultOptions
        options={bundle.options}
        voteCounts={bundle.voteCounts}
        selectedOptionId={bundle.selectedOptionId}
      />

       <div className="mt-6 flex w-full items-center justify-between gap-3 border-t border-gray-700 pt-5">
        <div ref={shareMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShareMenuOpen((current) => !current)}
             className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-gray-700 bg-gray-900 px-3 text-xs font-medium text-gray-200 transition hover:border-gray-600 hover:bg-gray-800"
          >
            {shareButtonText}
          </button>

          {shareMenuOpen ? (
            <div className="absolute bottom-full left-0 z-40 mb-2 w-full min-w-[210px] overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl sm:w-[210px]">
              <button
                type="button"
                onClick={() => void handleShare()}
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

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2.5">
          {REACTIONS.map((reaction) => {
            const isSelected = selectedReaction === reaction.type;

            return (
              <button
                key={reaction.type}
                type="button"
                onClick={() => onReaction(bundle.poll.id, reaction.type)}
                 className={`inline-flex h-8 min-w-[48px] cursor-pointer items-center justify-center gap-1.5 rounded-full border px-2.5 text-sm transition duration-150 active:scale-[0.97] ${
                  isSelected
                    ? "border-gray-300 bg-gray-200 text-black"
                    : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600 hover:bg-gray-800"
                }`}
                aria-label={reaction.label}
                title={reaction.label}
              >
                <span>{reaction.emoji}</span>
                <span>{reactionCounts[reaction.type] || 0}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const [votedPolls, setVotedPolls] = useState<PollBundle[]>([]);
  const [newPolls, setNewPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showTopButton, setShowTopButton] = useState(false);
  const [totalVoteCount, setTotalVoteCount] = useState<number | null>(null);
  const [browserId, setBrowserId] = useState("");
const [reactionCountsByPoll, setReactionCountsByPoll] = useState<Record<number, ReactionCounts>>({});
const [selectedReactionsByPoll, setSelectedReactionsByPoll] = useState<Record<number, ReactionType | null>>({});
const lastReactionRefreshRef = useRef(0);

  useEffect(() => {
    setBrowserId(getResultsBrowserId());
  }, []);

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);

      try {
        const { data: statsRow } = await supabase
          .from("site_stats")
          .select("total_votes")
          .eq("key", "global")
          .single();

        setTotalVoteCount(statsRow?.total_votes ?? 0);

        const votedMeta: Array<{ pollId: number; selectedOptionId: number | null; votedAt: number }> = [];

        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i) || "";
          if (!key.startsWith("poll-voted-")) continue;
          if (localStorage.getItem(key) !== "true") continue;

          const pollId = Number(key.replace("poll-voted-", ""));
          if (Number.isNaN(pollId)) continue;

          const selectedRaw =
            localStorage.getItem(`poll-selected-${pollId}`) ||
            localStorage.getItem(`poll-selected-option-${pollId}`);
          const votedAtRaw = localStorage.getItem(`poll-voted-at-${pollId}`);

          votedMeta.push({
            pollId,
            selectedOptionId: selectedRaw ? Number(selectedRaw) : null,
            votedAt: votedAtRaw ? Number(votedAtRaw) : 0,
          });
        }

        const votedPollIds = votedMeta.map((item) => item.pollId);

        if (votedPollIds.length > 0) {
          const [{ data: pollRows }, { data: optionRows }] = await Promise.all([
            supabase
              .from("polls")
              .select("id, question, description, category, slug, is_private, is_publicly_listed, total_votes")
              .in("id", votedPollIds),
            supabase
              .from("poll_options")
              .select("id, poll_id, option_text, vote_count, image_url")
              .in("poll_id", votedPollIds)
              .order("id", { ascending: true }),
          ]);

          const pollMap = new Map<number, Poll>();
          (pollRows || []).forEach((poll) => {
            pollMap.set(poll.id, poll as Poll);
          });

          const optionsByPoll = new Map<number, PollOption[]>();
          (optionRows || []).forEach((option) => {
            const typed = option as PollOption;
            const existing = optionsByPoll.get(typed.poll_id) || [];
            existing.push(typed);
            optionsByPoll.set(typed.poll_id, existing);
          });

          const bundles: PollBundle[] = votedMeta
            .map((meta) => {
              const poll = pollMap.get(meta.pollId);
              if (!poll) return null;

              const options = optionsByPoll.get(meta.pollId) || [];
              const voteCounts: VoteCounts = {};
              options.forEach((option) => {
                voteCounts[option.id] = option.vote_count || 0;
              });

              return {
                poll,
                options,
                voteCounts,
                selectedOptionId: meta.selectedOptionId,
                votedAt: meta.votedAt,
              };
            })
            .filter((item): item is PollBundle => Boolean(item))
            .sort((a, b) => b.votedAt - a.votedAt);

          setVotedPolls(bundles);
        } else {
          setVotedPolls([]);
        }

        const { data: newPollRows } = await supabase
          .from("polls")
          .select("id, question, description, category, slug, is_private, is_publicly_listed, total_votes")
          .eq("is_private", false)
          .eq("is_publicly_listed", true)
          .order("id", { ascending: false })
          .limit(100);

        const votedSet = new Set(votedPollIds);
        setNewPolls(((newPollRows || []) as Poll[]).filter((poll) => !votedSet.has(poll.id)));
      } catch {
        setVotedPolls([]);
        setNewPolls([]);
      } finally {
        setLoading(false);
      }
    };

    void loadResults();
  }, []);



   const visiblePollIds = useMemo(() => {
    return votedPolls.map((bundle) => bundle.poll.id);
  }, [votedPolls]);

  const visiblePollIdsKey = useMemo(() => visiblePollIds.join(","), [visiblePollIds]);

  const refreshReactions = useCallback(async () => {
    if (!browserId || !visiblePollIdsKey) return;

    const pollIds = visiblePollIdsKey;

    try {
      const response = await fetch(
        `/api/poll-reactions?pollIds=${encodeURIComponent(pollIds)}&browserId=${encodeURIComponent(browserId)}&t=${Date.now()}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) return;

      setReactionCountsByPoll(data.counts || {});
      setSelectedReactionsByPoll(data.selected || {});
    } catch {
      // ignore reaction load failures
    }
  }, [browserId, visiblePollIdsKey]);

useEffect(() => {
  void refreshReactions();
}, [refreshReactions]);

useEffect(() => {
  if (!browserId || visiblePollIds.length === 0) return;

  const refreshReactionsThrottled = () => {
    const now = Date.now();

    if (now - lastReactionRefreshRef.current < 2500) {
      return;
    }

    lastReactionRefreshRef.current = now;
    void refreshReactions();
  };

  const channel = supabase
    .channel("results-live-reactions")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "poll_reactions",
      },
      refreshReactionsThrottled
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [browserId, visiblePollIdsKey, refreshReactions]);

   const refreshTotalVoteCount = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("site_stats")
        .select("total_votes")
        .eq("key", "global")
        .single();

      if (!error) {
        setTotalVoteCount(data?.total_votes ?? 0);
      }
    } catch {
      // ignore total vote refresh failures
    }
  }, []);

  const refreshDisplayedVoteCounts = useCallback(async () => {
    if (visiblePollIds.length === 0) return;

    const pollIds = visiblePollIds;

    try {
      const { data, error } = await supabase
        .from("poll_options")
        .select("id, poll_id, option_text, vote_count, image_url")
        .in("poll_id", pollIds)
        .order("id", { ascending: true });

      if (error || !data) return;

      const optionsByPoll = new Map<number, PollOption[]>();

      data.forEach((option) => {
        const typed = option as PollOption;
        const existing = optionsByPoll.get(typed.poll_id) || [];
        existing.push(typed);
        optionsByPoll.set(typed.poll_id, existing);
      });

      setVotedPolls((current) =>
        current.map((bundle) => {
          const options = optionsByPoll.get(bundle.poll.id);
          if (!options) return bundle;

          const voteCounts: VoteCounts = {};
          options.forEach((option) => {
            voteCounts[option.id] = option.vote_count || 0;
          });

          return {
            ...bundle,
            options,
            voteCounts,
          };
        })
      );
    } catch {
      // ignore vote refresh failures
    }
  }, [visiblePollIds]);

  useEffect(() => {
    const onScroll = () => {
      setShowTopButton(window.scrollY > 800);
    };

    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

   useEffect(() => {
const refreshVisibleResults = () => {
  void refreshTotalVoteCount();
  void refreshDisplayedVoteCounts();
};

    refreshVisibleResults();

    const interval = window.setInterval(() => {
      refreshVisibleResults();
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshVisibleResults();
      }
    };

    const handleFocus = () => {
      refreshVisibleResults();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshTotalVoteCount, refreshDisplayedVoteCounts]);

  const filteredVotedPolls = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return votedPolls;
    return votedPolls.filter((bundle) => bundle.poll.question.toLowerCase().includes(term));
  }, [searchTerm, votedPolls]);

  const handleReaction = async (pollId: number, reactionType: ReactionType) => {
    if (!browserId) return;

    const previousSelected = selectedReactionsByPoll[pollId] || null;
    const previousCounts = reactionCountsByPoll[pollId] || getEmptyReactionCounts();
    const nextSelected = previousSelected === reactionType ? null : reactionType;

    const optimisticCounts = { ...previousCounts };

    if (previousSelected) {
      optimisticCounts[previousSelected] = Math.max((optimisticCounts[previousSelected] || 0) - 1, 0);
    }

    if (nextSelected) {
      optimisticCounts[nextSelected] = (optimisticCounts[nextSelected] || 0) + 1;
    }

    setSelectedReactionsByPoll((current) => ({
      ...current,
      [pollId]: nextSelected,
    }));

    setReactionCountsByPoll((current) => ({
      ...current,
      [pollId]: optimisticCounts,
    }));

    try {
      const response = await fetch("/api/poll-reactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pollId,
          reactionType,
          browserId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSelectedReactionsByPoll((current) => ({
          ...current,
          [pollId]: previousSelected,
        }));

        setReactionCountsByPoll((current) => ({
          ...current,
          [pollId]: previousCounts,
        }));

        return;
      }

      setReactionCountsByPoll((current) => ({
        ...current,
        [pollId]: data.counts || getEmptyReactionCounts(),
      }));

      setSelectedReactionsByPoll((current) => ({
        ...current,
        [pollId]: data.selected || null,
      }));
    } catch {
      // ignore reaction save failures
    }
  };

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
        <SiteHeader />

        <section className="mx-auto max-w-4xl px-6 pt-2 pb-8">
          <div className="mb-5 text-center">
            <h1 className="mb-2 text-4xl font-bold md:text-5xl">Poll & See</h1>
            <p className="text-lg text-gray-300">See what people really think</p>
            {totalVoteCount !== null && <LiveVoteCounter value={totalVoteCount} />}
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-4xl font-bold md:text-5xl">Your results</h2>
            <p className="mt-2 text-lg text-gray-300">Polls you’ve voted on, with full results</p>
          </div>

          <div className="mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by question..."
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500"
            />
          </div>

          {loading ? (
            <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 text-gray-300">
              Loading results...
            </div>
          ) : (
            <>
              <div className="space-y-5">
                {filteredVotedPolls.length > 0 ? (
                  filteredVotedPolls.map((bundle, index) => (
                    <div key={bundle.poll.id}>
                      <ResultCard
                        bundle={bundle}
                        reactionCounts={reactionCountsByPoll[bundle.poll.id] || getEmptyReactionCounts()}
                        selectedReaction={selectedReactionsByPoll[bundle.poll.id] || null}
                        onReaction={(pollId, reactionType) => {
                          void handleReaction(pollId, reactionType);
                        }}
                      />

{(index + 1) % 10 === 0 ? (
  <div className="mt-5 flex justify-center">
   <div className="w-full max-w-md rounded-2xl border border-blue-500/40 bg-gray-800/80 p-5 text-center shadow-[0_0_20px_rgba(59,130,246,0.1)]">
      
      <p className="mb-3 text-base font-medium text-white">
        {RESULTS_CREATE_POLL_PROMPTS[Math.floor(index / 10) % RESULTS_CREATE_POLL_PROMPTS.length]}
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
                  ))
                ) : (
                  <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 text-gray-300">
                    You haven’t voted on any polls yet.
                  </div>
                )}
              </div>

              <div className="mt-10 mb-5">
                <h2 className="text-2xl font-semibold">New polls to vote on</h2>
              </div>

              {newPolls.length > 0 ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {newPolls.map((poll) => (
                    <Link
                      key={poll.id}
                      href={`/poll/${poll.slug}`}
                      className="relative overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 p-4 shadow-lg transition hover:border-gray-500 flex min-h-[190px] flex-col justify-between"
                    >
                      <div className="mb-3 flex items-center">
                        <span
                          className="rounded-full px-2 py-1 text-xs"
                          style={{
                            color: getCategoryColours(poll.category).text,
                            backgroundColor: getCategoryColours(poll.category).bg,
                            border: `1px solid ${getCategoryColours(poll.category).border}`,
                          }}
                        >
                          {poll.category}
                        </span>
                      </div>

                      <div className="flex-1 py-2">
                        <h4 className="text-left text-lg font-semibold">{poll.question}</h4>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 text-sm text-gray-400">
                        <span>Vote now</span>
                        <span aria-hidden="true" className="text-base leading-none">
                          ›
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-6 text-center">
                  <p className="text-gray-300">You’ve voted on all live polls.</p>

                  <Link
                    href="/"
                    className="mt-4 inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-gray-200"
                  >
                    Back to home
                  </Link>
                </div>
              )}
            </>
          )}
        </section>

        <Footer />

        {showTopButton ? (
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
        ) : null}
      </main>
    </>
  );
}