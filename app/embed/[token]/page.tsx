"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Poll = {
  id: number;
  question: string;
  description: string;
  category: string;
  slug: string;
  is_private?: boolean;
  created_at?: string | null;
  is_embeddable: boolean;
  embed_active: boolean;
  embed_voting_enabled: boolean;
  embed_token: string;
};

type PollOption = {
  id: number;
  poll_id: number;
  option_text: string;
  vote_count: number;
  image_url?: string | null;
};

type VoteCounts = Record<number, number>;

const OPTION_COLOURS = [
  "#2563eb",
  "#22c55e",
  "#fbbf24",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#ef4444",
];

const SAME_POLL_CLICK_GUARD_MS = 400;
const BASE_CARD_WIDTH = 520;
const COMPACT_BREAKPOINT = 360;
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

function hasLocalVote(pollId: number): boolean {
  if (typeof window === "undefined") return false;
  return (
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
  localStorage.setItem(getPollVotedKey(pollId), "true");
  if (optionId !== null) {
    localStorage.setItem(getPollSelectedNewKey(pollId), String(optionId));
    localStorage.setItem(getPollSelectedOldKey(pollId), String(optionId));
  }
}

async function submitVote(pollId: number, optionId: number, embedToken: string) {
  const response = await fetch("/api/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pollId, optionId, embedToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Vote failed");
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
    <div className="space-y-1.5">
      {options.map((option, index) => {
        const count = voteCounts[option.id] || 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
const animatedPercent = percent > 0 ? Math.max(12, percent) : 0;
        const colour = OPTION_COLOURS[index] || OPTION_COLOURS[0];
        const isSelected = selectedOptionId === option.id;

        return (
          <div
  key={option.id}
  className="rounded-xl transition-opacity duration-200 hover:opacity-95"
  style={{
    border: isSelected ? `2px solid ${colour}` : "2px solid transparent",
    boxShadow: isSelected ? `0 0 0 1px ${colour}22, 0 0 10px ${colour}14` : "none",
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
                 <span className="min-w-0 break-words text-sm leading-5 text-white sm:text-base">
  {option.option_text}
</span>
                </div>
                <span className="shrink-0 whitespace-nowrap text-right text-sm font-semibold text-gray-300">
                  {percent}%
                </span>
              </div>
            </div>

            <div className="px-2.5 pb-1.5 pt-1">
              <div className="h-5 w-full overflow-hidden rounded-full bg-gray-700">
  <div
    className="h-5 transition-[width] duration-300 ease-out"
    style={{ width: `${animatedPercent}%`, backgroundColor: colour, opacity: 0.96 }}
  />
</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmbedFooter() {
  return (
    <div className="mt-4 border-t border-gray-700 pt-4 text-center">
      <Link
        href="https://www.pollandsee.com"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-1 text-sm text-gray-400 transition hover:text-white"
      >
        <img
          src="/favicon.ico"
          alt="Poll & See"
          className="h-[14px] w-[14px] opacity-95"
        />
        <span>Powered by Poll &amp; See</span>
      </Link>
    </div>
  );
}

export default function EmbedPollPage() {
  const params = useParams();
  const token = String(params.token);

  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [counts, setCounts] = useState<VoteCounts>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const outerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [availableWidth, setAvailableWidth] = useState(BASE_CARD_WIDTH);
  const [cardHeight, setCardHeight] = useState(0);

  const totalVotes = useMemo(
    () => Object.values(counts).reduce((sum, count) => sum + count, 0),
    [counts]
  );

  const resultsOnly = poll ? !poll.embed_voting_enabled : false;
  const hasImageOptions = options.some((option) => Boolean(option.image_url));

const isCompactMode = availableWidth < COMPACT_BREAKPOINT;

const scale = useMemo(() => {
  if (isCompactMode) return 1;
  const next = availableWidth / BASE_CARD_WIDTH;
  return Math.min(1, Math.max(0.42, next));
}, [availableWidth, isCompactMode]);

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.background = "transparent";
    document.body.style.overflow = "hidden";
    document.body.style.minHeight = "0";
    document.body.style.width = "100%";

    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.documentElement.style.background = "transparent";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.minHeight = "0";
    document.documentElement.style.width = "100%";

    return () => {
      document.body.style.margin = "";
      document.body.style.padding = "";
      document.body.style.background = "";
      document.body.style.overflow = "";
      document.body.style.minHeight = "";
      document.body.style.width = "";

      document.documentElement.style.margin = "";
      document.documentElement.style.padding = "";
      document.documentElement.style.background = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.minHeight = "";
      document.documentElement.style.width = "";
    };
  }, []);

  useEffect(() => {
    const loadPoll = async () => {
      setLoading(true);

      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .select(
          "id, question, description, category, slug, is_private, created_at, is_embeddable, embed_active, embed_voting_enabled, embed_token"
        )
        .eq("embed_token", token)
        .eq("is_embeddable", true)
        .maybeSingle();

      if (pollError || !pollData) {
        setPoll(null);
        setOptions([]);
        setCounts({});
        setLoading(false);
        return;
      }

      const { data: optionRows, error: optionsError } = await supabase
        .from("poll_options")
        .select("id, poll_id, option_text, vote_count, image_url")
        .eq("poll_id", pollData.id)
        .order("id", { ascending: true });

      if (optionsError) {
        setPoll(null);
        setOptions([]);
        setCounts({});
        setLoading(false);
        return;
      }

      const nextCounts: VoteCounts = {};
      (optionRows || []).forEach((option) => {
        nextCounts[option.id] = option.vote_count || 0;
      });

      setPoll(pollData as Poll);
      setOptions((optionRows || []) as PollOption[]);
      setCounts(nextCounts);

      const votedLocally = hasLocalVote(pollData.id);
      const selectedLocally = getLocalSelectedOption(pollData.id);

      setVoted(votedLocally);
      setSelected(selectedLocally);
      setError("");
      setLoading(false);
    };

    void loadPoll();
  }, [token]);

  useEffect(() => {
    if (!poll) return;

    const optionsChannel = supabase
      .channel(`embed-poll-options-${poll.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poll_options",
          filter: `poll_id=eq.${poll.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("poll_options")
            .select("id, poll_id, option_text, vote_count, image_url")
            .eq("poll_id", poll.id)
            .order("id", { ascending: true });

          if (!data) return;

          const nextCounts: VoteCounts = {};
          data.forEach((option) => {
            const serverCount = option.vote_count || 0;
            const localCount = counts[option.id] || 0;
            nextCounts[option.id] = hasLocalVote(poll.id) ? Math.max(serverCount, localCount) : serverCount;
          });

          setOptions(data as PollOption[]);
          setCounts(nextCounts);
        }
      )
      .subscribe();

    const pollChannel = supabase
      .channel(`embed-poll-status-${poll.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "polls",
          filter: `id=eq.${poll.id}`,
        },
        (payload) => {
          const nextPoll = payload.new as Poll;
          setPoll((current) =>
            current
              ? {
                  ...current,
                  is_embeddable: nextPoll.is_embeddable,
                  embed_active: nextPoll.embed_active,
                  embed_voting_enabled: nextPoll.embed_voting_enabled,
                }
              : current
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(optionsChannel);
      supabase.removeChannel(pollChannel);
    };
  }, [poll, counts]);

  useEffect(() => {
    if (!outerRef.current) return;

    const element = outerRef.current;

    const updateWidth = () => {
      const nextWidth = element.getBoundingClientRect().width || BASE_CARD_WIDTH;
      setAvailableWidth(nextWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!cardRef.current) return;

    const element = cardRef.current;

    const updateHeight = () => {
      setCardHeight(element.scrollHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [loading, poll, options, counts, voted, error, resultsOnly, scale]);

useEffect(() => {
  const renderedHeight = Math.ceil(cardHeight * (isCompactMode ? 1 : scale));

  if (window.parent !== window) {
    window.parent.postMessage(
      {
        type: "pollandsee:embed-height",
        height: renderedHeight,
      },
      "*"
    );
  }
}, [cardHeight, scale, isCompactMode]);

  const handleVote = async (optionId: number) => {
    if (!poll) return;
    if (voted) return;
    if (resultsOnly) return;

    const cooldownError = canVoteNow(poll.id);
    if (cooldownError) {
      setError(cooldownError);
      return;
    }

    setError("");

    const previousCounts = counts;
    const previousSelected = selected;
    const previousVoted = voted;

    setVoted(true);
    setSelected(optionId);
    setCounts((current) => ({
      ...current,
      [optionId]: (current[optionId] || 0) + 1,
    }));

    markPollVotedLocally(poll.id, optionId);

    try {
      await submitVote(poll.id, optionId, token);
      recordVoteClient(poll.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit vote.";
      const lower = message.toLowerCase();

      if (lower.includes("already voted")) {
        markPollVotedLocally(poll.id, optionId);
        setError("");
        setVoted(true);
        setSelected(optionId);
        return;
      }

      localStorage.removeItem(getPollVotedKey(poll.id));
      localStorage.removeItem(getPollSelectedOldKey(poll.id));
      localStorage.removeItem(getPollSelectedNewKey(poll.id));

      setCounts(previousCounts);
      setSelected(previousSelected);
      setVoted(previousVoted);
      setError(message);
    }
  };

const compactWidth = Math.max(availableWidth, 220);
const renderedWidth = isCompactMode ? compactWidth : Math.ceil(BASE_CARD_WIDTH * scale);

const scaledWrapperStyle = {
  width: `${renderedWidth}px`,
  height: cardHeight
    ? `${Math.ceil(cardHeight * (isCompactMode ? 1 : scale))}px`
    : "0px",
};

const scaledCardStyle = isCompactMode
  ? ({
      width: `${compactWidth}px`,
      transform: "none",
      transformOrigin: "top left",
    } as const)
  : ({
      width: `${BASE_CARD_WIDTH}px`,
      transform: `scale(${scale})`,
      transformOrigin: "bottom left",
    } as const);

  if (loading) {
    return (
      <main className="m-0 w-full overflow-hidden bg-transparent p-0 text-white">
        <div ref={outerRef} className="w-full overflow-hidden bg-transparent">
          <div className="mx-auto" style={scaledWrapperStyle}>
            <div ref={cardRef} style={scaledCardStyle}>
          <div
  className={`w-full overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 ${
    isCompactMode ? "p-4" : "p-6"
  }`}
>
                <p className="text-sm text-gray-300">Loading poll...</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!poll || !poll.is_embeddable || !poll.embed_active) {
    return (
      <main className="m-0 w-full overflow-hidden bg-transparent p-0 text-white">
        <div ref={outerRef} className="w-full overflow-hidden bg-transparent">
          <div className="mx-auto" style={scaledWrapperStyle}>
            <div ref={cardRef} style={scaledCardStyle}>
           <div
  className={`w-full overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 text-center ${
    isCompactMode ? "p-4" : "p-6"
  }`}
>
                <p className="text-base font-medium text-white">This poll is not currently active.</p>
  <EmbedFooter />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="m-0 w-full overflow-hidden bg-transparent p-0 text-white">
      <div ref={outerRef} className="w-full overflow-hidden bg-transparent">
        <div className="mx-auto" style={scaledWrapperStyle}>
          <div ref={cardRef} style={scaledCardStyle}>
           <div
  className={`w-full overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 ${
    isCompactMode ? "p-4" : "p-6"
  }`}
>
  <div className={`flex flex-col ${isCompactMode ? "min-h-[500px]" : "min-h-[560px]"}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div></div>
                <span className="text-sm text-gray-400">
                  {totalVotes.toLocaleString()} {totalVotes === 1 ? "vote" : "votes"}
                </span>
              </div>

             <h1
  className={`mb-2 break-words font-bold text-white ${
    isCompactMode ? "text-lg leading-7" : "text-2xl"
  }`}
>
  {poll.question}
</h1>

              {poll.description ? (
              <p
  className={`mb-4 break-words text-gray-300 ${
    isCompactMode ? "text-sm leading-6" : ""
  }`}
>
  {poll.description}
</p>
              ) : null}

              {!voted && !resultsOnly ? (
                <div className="flex flex-col gap-3">
                  {hasImageOptions ? (
                 <p className={`mb-[8px] mt-[6px] text-gray-300 opacity-80 ${isCompactMode ? "text-xs" : "text-sm"}`}>
                      Tap an image to vote
                    </p>
                  ) : null}

                  {options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleVote(option.id)}
                      className={
                        option.image_url
                          ? "w-full cursor-pointer overflow-hidden rounded-xl bg-gray-700 text-left text-white transition hover:bg-gray-600"
                      : `w-full cursor-pointer overflow-hidden rounded-xl bg-gray-700 text-left text-white transition hover:bg-gray-600 ${
    isCompactMode ? "px-3 py-3 text-sm" : "px-4 py-3.5"
  }`
                      }
                    >
                      {option.image_url ? (
                        <>
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
                       <div className={`break-words ${isCompactMode ? "px-3 py-3 text-sm" : "px-4 py-3.5"}`}>
  {option.option_text}
</div>
                        </>
                      ) : (
                        <span className="break-words">{option.option_text}</span>
                      )}
                    </button>
                  ))}

                  {error ? <p className="text-sm text-red-300">{error}</p> : null}
                </div>
              ) : (
                <>
                  <ResultOptions options={options} voteCounts={counts} selectedOptionId={selected} />

                  {resultsOnly ? (
                 <div
  className={`mt-4 rounded-xl border border-gray-700 bg-gray-900/70 text-center text-gray-300 ${
    isCompactMode ? "px-3 py-2.5 text-xs" : "px-4 py-3 text-sm"
  }`}
>
                      Poll closed. Final results shown above.
                    </div>
                  ) : null}

                  {error ? <p className="pt-3 text-sm text-red-300">{error}</p> : null}
                </>
              )}

              <div className="mt-auto pt-2">
                <EmbedFooter />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </main>
  );
}