"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Poll = {
  id: number;
  question: string;
  description: string;
  category: string;
  slug: string;
};

type PollOption = {
  id: number;
  poll_id: number;
  option_text: string;
};

type VoteCounts = Record<number, number>;

type PollBundle = {
  poll: Poll;
  options: PollOption[];
  voteCounts: VoteCounts;
};

const OPTION_COLOURS = ["#2563eb", "#22c55e", "#fbbf24", "#ec4899"];
const GLOBAL_COOLDOWN_MS = 4000;

function canVoteNow(): string | null {
  const last = Number(localStorage.getItem("lastVote") || 0);
  if (Date.now() - last < GLOBAL_COOLDOWN_MS) {
    return "Please wait a few seconds before voting again.";
  }
  return null;
}

function recordVoteClient() {
  localStorage.setItem("lastVote", String(Date.now()));
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

  const voted = localStorage.getItem(getPollVotedKey(pollId)) === "true";
  const selectedOld = localStorage.getItem(getPollSelectedOldKey(pollId));
  const selectedNew = localStorage.getItem(getPollSelectedNewKey(pollId));

  return voted || selectedOld !== null || selectedNew !== null;
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
    <div className="space-y-4">
      {options.map((option, index) => {
        const count = voteCounts[option.id] || 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        const colour = OPTION_COLOURS[index] || OPTION_COLOURS[0];
        const isSelected = selectedOptionId === option.id;

        return (
          <div
            key={option.id}
            className="rounded-xl border p-3"
            style={{ borderColor: isSelected ? colour : "transparent" }}
          >
            <div className="flex justify-between gap-3 text-white">
              <span className="min-w-0 break-words">
                {isSelected ? "✓ " : ""}
                {option.option_text}
              </span>
              <span className="shrink-0">{percent}%</span>
            </div>

            <div className="mt-2 h-3 rounded-full bg-gray-700">
              <div
                className="h-3 rounded-full"
                style={{ width: `${percent}%`, background: colour }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PollCard({
  bundle,
  showBackButton,
  onVoteComplete,
}: {
  bundle: PollBundle;
  showBackButton: boolean;
  onVoteComplete: (pollId: number, category: string) => void;
}) {
  const initialVoted = useMemo(() => hasLocalVote(bundle.poll.id), [bundle.poll.id]);
  const initialSelected = useMemo(() => getLocalSelectedOption(bundle.poll.id), [bundle.poll.id]);

  const [voted, setVoted] = useState<boolean>(initialVoted);
  const [counts, setCounts] = useState<VoteCounts>(bundle.voteCounts);
  const [selected, setSelected] = useState<number | null>(initialSelected);
  const [error, setError] = useState<string>("");
  const [shareText, setShareText] = useState("Share poll");

  const totalVotes = Object.values(counts).reduce((sum, count) => sum + count, 0);

  useEffect(() => {
    setVoted(hasLocalVote(bundle.poll.id));
    setSelected(getLocalSelectedOption(bundle.poll.id));
    setCounts(bundle.voteCounts);
    setError("");
    setShareText("Share poll");
  }, [bundle]);

  const handleShare = async () => {
    const url = `${window.location.origin}/poll/${bundle.poll.slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Poll & See",
          text: `Vote on this poll: ${bundle.poll.question}`,
          url,
        });
        return;
      } catch {
        // ignore and fall through
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareText("Link copied");
      setTimeout(() => setShareText("Share poll"), 2000);
    } catch {
      setShareText("Could not copy");
      setTimeout(() => setShareText("Share poll"), 2000);
    }
  };

  const handleVote = async (optionId: number) => {
    if (voted) return;

    const cooldownError = canVoteNow();
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

    try {
      await submitVote(bundle.poll.id, optionId);

      localStorage.setItem(getPollVotedKey(bundle.poll.id), "true");
      localStorage.setItem(getPollSelectedNewKey(bundle.poll.id), String(optionId));
      localStorage.setItem(getPollSelectedOldKey(bundle.poll.id), String(optionId));
      recordVoteClient();

      onVoteComplete(bundle.poll.id, bundle.poll.category);
    } catch (err) {
      setCounts(previousCounts);
      setSelected(previousSelected);
      setVoted(previousVoted);
      setError(err instanceof Error ? err.message : "Could not submit vote.");
    }
  };

  return (
    <div className="mb-8 rounded-2xl border border-gray-700 bg-gray-800 p-6">
      <div className="mb-4 flex justify-between">
        <span className="text-sm text-gray-300">{bundle.poll.category}</span>
        <span className="text-sm text-gray-400">{totalVotes} votes</span>
      </div>

      <h2 className="mb-3 text-2xl font-bold">{bundle.poll.question}</h2>
      <p className="mb-6 text-gray-300">{bundle.poll.description}</p>

      {!voted ? (
        <div className="flex flex-col gap-3">
          {bundle.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              className="rounded-xl bg-gray-700 py-3 text-white hover:bg-gray-600"
            >
              {option.option_text}
            </button>
          ))}

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
      ) : (
        <>
          <ResultOptions
            options={bundle.options}
            voteCounts={counts}
            selectedOptionId={selected}
          />

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleShare}
              className="rounded-xl bg-white px-4 py-2 text-black"
            >
              {shareText}
            </button>

            <Link
              href={`/?category=${encodeURIComponent(bundle.poll.category)}#live-polls`}
              className="rounded-xl border border-gray-600 px-4 py-2"
            >
              See other {bundle.poll.category} polls
            </Link>

            {showBackButton ? (
              <Link href="/" className="rounded-xl border border-gray-600 px-4 py-2">
                Go to all polls
              </Link>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export default function PollPage() {
  const params = useParams();
  const slug = String(params.slug);

  const [polls, setPolls] = useState<PollBundle[]>([]);

  const loadBundle = async (pollId: number): Promise<PollBundle> => {
    const { data: pollData } = await supabase.from("polls").select("*").eq("id", pollId).single();

    const { data: optionsData } = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", pollId)
      .order("id", { ascending: true });

    const { data: votesData } = await supabase
      .from("votes")
      .select("option_id")
      .eq("poll_id", pollId);

    const counts: VoteCounts = {};

    (votesData || []).forEach((vote: { option_id: number }) => {
      counts[vote.option_id] = (counts[vote.option_id] || 0) + 1;
    });

    return {
      poll: pollData as Poll,
      options: (optionsData || []) as PollOption[],
      voteCounts: counts,
    };
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from("polls").select("*").eq("slug", slug).single();

      if (!data) return;

      const firstBundle = await loadBundle(data.id);
      setPolls([firstBundle]);
    };

    void init();
  }, [slug]);

  const loadNext = async (currentId: number, category: string) => {
    const { data } = await supabase
      .from("polls")
      .select("*")
      .neq("id", currentId)
      .order("id", { ascending: false });

    const pollList = (data || []) as Poll[];

    const unseen = pollList.filter((poll) => !hasLocalVote(poll.id));

    const sameCategory = unseen.find((poll) => poll.category === category);
    const nextPoll = sameCategory || unseen[0];

    if (!nextPoll) return;

    const nextBundle = await loadBundle(nextPoll.id);

    setPolls((current) => {
      if (current.some((item) => item.poll.id === nextBundle.poll.id)) {
        return current;
      }
      return [...current, nextBundle];
    });
  };

  const allShownPollsVoted =
    polls.length > 0 && polls.every((bundle) => hasLocalVote(bundle.poll.id));

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

      <section className="mx-auto max-w-3xl px-6 pt-2 pb-8">
        <Link href="/" className="text-sm text-blue-300">
          ← Back to polls
        </Link>

        {polls.map((bundle, index) => (
          <PollCard
            key={bundle.poll.id}
            bundle={bundle}
            showBackButton={index !== 0}
            onVoteComplete={(pollId, category) => {
              void loadNext(pollId, category);
            }}
          />
        ))}

        {allShownPollsVoted ? (
          <div className="mt-6 text-center">
            <Link
              href="/submit-poll"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-500"
            >
              Create your own poll
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}