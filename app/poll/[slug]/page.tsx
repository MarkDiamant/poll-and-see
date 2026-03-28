"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/* TYPES */

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

/* CONSTANTS */

const OPTION_COLOURS = ["#2563eb", "#22c55e", "#fbbf24", "#ec4899"];

const SIGNUP_CATEGORIES = [
  "Business",
  "Community",
  "Education",
  "Finance",
  "Fun",
  "General",
  "Lifestyle",
];

/* SHARE TEXT FORMAT */

function buildShareText(question: string, url: string) {
  return `${question}

Vote and see what others think:

${url}`;
}

/* RESULT DISPLAY */

function ResultOptions({
  options,
  voteCounts,
  selectedOptionId,
}: {
  options: PollOption[];
  voteCounts: VoteCounts;
  selectedOptionId: number | null;
}) {
  const total = Object.values(voteCounts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="space-y-4">
      {options.map((option, index) => {
        const votes = voteCounts[option.id] || 0;
        const pct = total ? Math.round((votes / total) * 100) : 0;
        const colour = OPTION_COLOURS[index] || OPTION_COLOURS[0];
        const selected = selectedOptionId === option.id;

        return (
          <div
            key={option.id}
            className="rounded-xl"
            style={{
              border: selected ? `3px solid ${colour}` : "3px solid transparent",
            }}
          >
            <div className="px-3 pt-3">
              <div className="flex justify-between text-white">
                <div className="flex gap-2">
                  {selected && <span>✓</span>}
                  {option.option_text}
                </div>

                <span>{pct}%</span>
              </div>
            </div>

            <div className="px-3 pb-3 pt-2">
              <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${pct}%`,
                    background: colour,
                  }}
                  className="h-4"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* POLL CARD */

function PollCard({
  bundle,
  onVoteComplete,
}: {
  bundle: PollBundle;
  onVoteComplete: (pollId: number, category: string) => void;
}) {
  const [voted, setVoted] = useState(false);
  const [counts, setCounts] = useState(bundle.voteCounts);
  const [selected, setSelected] = useState<number | null>(null);
  const [shareText, setShareText] = useState("Share poll");

  useEffect(() => {
    setCounts(bundle.voteCounts);
  }, [bundle]);

  async function handleShare() {
    const url = `${window.location.origin}/poll/${bundle.poll.slug}`;

    const text = buildShareText(bundle.poll.question, url);

    if (navigator.share) {
      try {
        await navigator.share({
          text,
          url,
        });

        return;
      } catch {
        // fallback below
      }
    }

    try {
      await navigator.clipboard.writeText(text);

      setShareText("Link copied");

      setTimeout(() => setShareText("Share poll"), 2000);
    } catch {
      // silently ignore clipboard error
      setShareText("Share poll");
    }
  }

  async function vote(optionId: number) {
    if (voted) return;

    setVoted(true);
    setSelected(optionId);

    setCounts((c) => ({
      ...c,
      [optionId]: (c[optionId] || 0) + 1,
    }));

    await fetch("/api/vote", {
      method: "POST",
      body: JSON.stringify({
        pollId: bundle.poll.id,
        optionId,
      }),
    });

    onVoteComplete(bundle.poll.id, bundle.poll.category);
  }

  const totalVotes = Object.values(counts).reduce((s, v) => s + v, 0);

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 mb-8">

      <div className="flex justify-between mb-4">
        <span className="text-sm text-blue-300">{bundle.poll.category}</span>
        <span className="text-sm text-gray-400">{totalVotes} votes</span>
      </div>

      <h2 className="text-2xl font-bold mb-6">{bundle.poll.question}</h2>

      {!voted ? (
        <div className="space-y-3">
          {bundle.options.map((o) => (
            <button
              key={o.id}
              onClick={() => vote(o.id)}
              className="w-full cursor-pointer rounded-xl bg-gray-700 py-3 text-white hover:bg-gray-600"
            >
              {o.option_text}
            </button>
          ))}
        </div>
      ) : (
        <>
          <ResultOptions
            options={bundle.options}
            voteCounts={counts}
            selectedOptionId={selected}
          />

          <p className="text-sm text-gray-400 mt-4">
            You've voted
          </p>

          <div className="mt-6 flex flex-wrap gap-2">

            <button
              onClick={handleShare}
              className="rounded-xl bg-white px-4 py-2 text-sm text-black"
            >
              {shareText}
            </button>

            <Link
              href="/#live-polls"
              className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm"
            >
              Go to all polls
            </Link>

            <Link
              href={`/?category=${bundle.poll.category}#live-polls`}
              className="rounded-xl border border-gray-700 px-4 py-2 text-sm"
            >
              See other {bundle.poll.category} polls
            </Link>

          </div>
        </>
      )}
    </div>
  );
}

/* PAGE */

export default function Page() {
  const params = useParams();
  const slug = String(params.slug);

  const [bundles, setBundles] = useState<PollBundle[]>([]);

  const [email, setEmail] = useState("");
  const [categories, setCategories] = useState<string[]>(["All polls"]);

  async function loadInitial() {

    const poll = await supabase
      .from("polls")
      .select("*")
      .eq("slug", slug)
      .single();

    const options = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", poll.data.id);

    const votes = await supabase
      .from("votes")
      .select("option_id")
      .eq("poll_id", poll.data.id);

    const counts: VoteCounts = {};

    votes.data?.forEach((v:any)=>{
      counts[v.option_id] = (counts[v.option_id]||0)+1;
    });

    setBundles([
      {
        poll: poll.data,
        options: options.data || [],
        voteCounts: counts,
      },
    ]);
  }

  useEffect(()=>{
    loadInitial();
  },[]);

  async function subscribe(e:FormEvent) {

    e.preventDefault();

    await fetch("/api/subscribe",{
      method:"POST",
      body:JSON.stringify({
        email,
        categoryPreferences:
          categories.includes("All polls")
            ? null
            : categories
      })
    });

    setEmail("");
  }

  return (

    <main className="min-h-screen bg-black text-white">

      <div className="max-w-3xl mx-auto px-6 py-8">

        <Link href="/">
          <img src="/logo.png" className="h-14 mb-6"/>
        </Link>

        {bundles.map((b,i)=>(

          <div key={b.poll.id}>

            <PollCard
              bundle={b}
              onVoteComplete={()=>{}}
            />

            {i===0 && (

              <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 mb-8">

                <p className="text-sm mb-3">
                  Get new polls by email
                </p>

                <form onSubmit={subscribe}>

                  <input
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 mb-3"
                  />

                  <button
                    className="w-full bg-white text-black rounded-lg py-2"
                  >
                    Subscribe
                  </button>

                </form>

              </div>

            )}

          </div>

        ))}

      </div>

    </main>

  );

}