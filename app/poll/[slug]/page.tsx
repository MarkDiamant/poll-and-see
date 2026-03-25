"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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

const GLOBAL_COOLDOWN = 4000;

/* ---------------- vote helpers ---------------- */

function canVoteNow() {
  const last = Number(localStorage.getItem("lastVote") || 0);

  if (Date.now() - last < GLOBAL_COOLDOWN) {
    return "Please wait a few seconds before voting again.";
  }

  return null;
}

function recordVoteClient() {
  localStorage.setItem("lastVote", String(Date.now()));
}

async function submitVote(pollId: number, optionId: number) {

  const r = await fetch("/api/vote", {

    method: "POST",

    headers: {

      "Content-Type": "application/json",

    },

    body: JSON.stringify({

      pollId,

      optionId,

    }),

  });

  const j = await r.json();

  if (!r.ok) throw new Error(j.error || "Vote failed");

}

/* ---------------- result UI ---------------- */

function ResultOptions({

  options,

  voteCounts,

  selectedOptionId,

}: {

  options: PollOption[];

  voteCounts: VoteCounts;

  selectedOptionId: number | null;

}) {

  const total = Object.values(voteCounts as VoteCounts).reduce(

    (sum: number, count: number) => sum + count,

    0

  );

  return (

    <div className="space-y-4">

      {options.map((o, i) => {

        const count = voteCounts[o.id] || 0;

        const pct = total

          ? Math.round((count / total) * 100)

          : 0;

        const colour = OPTION_COLOURS[i] || OPTION_COLOURS[0];

        const selected = selectedOptionId === o.id;

        return (

          <div

            key={o.id}

            className="rounded-xl p-3 border"

            style={{

              borderColor: selected

                ? colour

                : "transparent",

            }}

          >

            <div className="flex justify-between text-white">

              <span>

                {selected ? "✓ " : ""}

                {o.option_text}

              </span>

              <span>{pct}%</span>

            </div>

            <div className="mt-2 h-3 bg-gray-700 rounded-full">

              <div

                className="h-3 rounded-full"

                style={{

                  width: pct + "%",

                  background: colour,

                }}

              />

            </div>

          </div>

        );

      })}

    </div>

  );

}

/* ---------------- poll card ---------------- */

function PollCard({

  bundle,

  showBackButton,

  onVoteComplete,

}: {

  bundle: PollBundle;

  showBackButton: boolean;

  onVoteComplete: (pollId: number, category: string) => void;

}) {

  const initialVoted =

    typeof window !== "undefined" &&

    localStorage.getItem("poll-voted-" + bundle.poll.id) === "true";

  const initialSelected =

    typeof window !== "undefined"

      ? Number(localStorage.getItem("poll-selected-" + bundle.poll.id))

      : null;

  const [voted, setVoted] = useState<boolean>(initialVoted);

  const [counts, setCounts] = useState(bundle.voteCounts);

  const [selected, setSelected] = useState<number | null>(

    Number.isNaN(initialSelected) ? null : initialSelected

  );

  const [error, setError] = useState("");

  const share = async () => {

    const url =

      window.location.origin +

      "/poll/" +

      bundle.poll.slug;

    await navigator.clipboard.writeText(url);

  };

  const vote = async (optionId: number) => {

    const err = canVoteNow();

    if (err) {

      setError(err);

      return;

    }

    setVoted(true);

    setSelected(optionId);

    setCounts((c) => ({

      ...c,

      [optionId]: (c[optionId] || 0) + 1,

    }));

    try {

      await submitVote(bundle.poll.id, optionId);

      localStorage.setItem(

        "poll-voted-" + bundle.poll.id,

        "true"

      );

      localStorage.setItem(

        "poll-selected-" + bundle.poll.id,

        String(optionId)

      );

      recordVoteClient();

      onVoteComplete(bundle.poll.id, bundle.poll.category);

    } catch {

      setError("Could not submit vote");

      setVoted(false);

    }

  };

  const total = Object.values(counts).reduce(

    (a, b) => a + b,

    0

  );

  return (

    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-8">

      <div className="flex justify-between mb-4">

        <span className="text-gray-300 text-sm">

          {bundle.poll.category}

        </span>

        <span className="text-gray-400 text-sm">

          {total} votes

        </span>

      </div>

      <h2 className="text-2xl font-bold mb-3">

        {bundle.poll.question}

      </h2>

      <p className="text-gray-300 mb-6">

        {bundle.poll.description}

      </p>

      {!voted ? (

        <div className="flex flex-col gap-3">

          {bundle.options.map((o) => (

            <button

              key={o.id}

              onClick={() => vote(o.id)}

              className="bg-gray-700 hover:bg-gray-600 rounded-xl py-3 text-white"

            >

              {o.option_text}

            </button>

          ))}

          {error && (

            <p className="text-red-300 text-sm">

              {error}

            </p>

          )}

        </div>

      ) : (

        <>

          <ResultOptions

            options={bundle.options}

            voteCounts={counts}

            selectedOptionId={selected}

          />

          <div className="flex gap-3 mt-6 flex-wrap">

            <button

              onClick={share}

              className="bg-white text-black px-4 py-2 rounded-xl"

            >

              Share poll

            </button>

            <Link

              href={"/?category=" + bundle.poll.category}

              className="px-4 py-2 rounded-xl border border-gray-600"

            >

              See other {bundle.poll.category} polls

            </Link>

            {showBackButton && (

              <Link

                href="/"

                className="px-4 py-2 rounded-xl border border-gray-600"

              >

                Go to all polls

              </Link>

            )}

          </div>

        </>

      )}

    </div>

  );

}

/* ---------------- page ---------------- */

export default function PollPage() {

  const { slug } = useParams();

  const [polls, setPolls] = useState<PollBundle[]>([]);

const loadBundle = async (pollId: number): Promise<PollBundle> => {

  const { data: poll } = await supabase
    .from("polls")
    .select("*")
    .eq("id", pollId)
    .single();

  const { data: optionsData } = await supabase
    .from("poll_options")
    .select("*")
    .eq("poll_id", pollId);

  const { data: votesData } = await supabase
    .from("votes")
    .select("option_id")
    .eq("poll_id", pollId);

  const counts: VoteCounts = {};

  (votesData || []).forEach((v: any) => {

    counts[v.option_id] =
      (counts[v.option_id] || 0) + 1;

  });

  return {

    poll: poll as Poll,

    options: (optionsData || []) as PollOption[],

    voteCounts: counts,

  };

};

  useEffect(() => {

    const init = async () => {

      const { data } = await supabase

        .from("polls")

        .select("*")

        .eq("slug", slug)

        .single();

      if (!data) return;

      const first = await loadBundle(data.id);

      setPolls([first]);

    };

    init();

  }, [slug]);

  const loadNext = async (

    currentId: number,

    category: string

  ) => {

    const { data } = await supabase

      .from("polls")

      .select("*")

      .neq("id", currentId)

      .order("id", { ascending: false });

    const unseen = data.filter(

      (p) =>

        !localStorage.getItem(

          "poll-voted-" + p.id

        )

    );

    const same = unseen.find(

      (p) => p.category === category

    );

    const next = same || unseen[0];

    if (!next) return;

    const bundle = await loadBundle(next.id);

    setPolls((p) => [...p, bundle]);

  };

  return (

    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">

      <header className="max-w-5xl mx-auto px-6 pt-6">

        <Link href="/">

          <img src="/logo.png" className="h-14" />

        </Link>

      </header>

      <section className="max-w-3xl mx-auto px-6 pt-4">

        <Link

          href="/"

          className="text-blue-300 text-sm"

        >

          ← Back to polls

        </Link>

        {polls.map((bundle, i) => (

          <PollCard

            key={bundle.poll.id}

            bundle={bundle}

            showBackButton={i !== 0}

            onVoteComplete={(id, cat) =>

              loadNext(id, cat)

            }

          />

        ))}

        {polls.length > 0 && (

          <div className="text-center mt-6">

            <Link

              href="/submit-poll"

              className="bg-blue-600 px-6 py-3 rounded-xl inline-block"

            >

              Create your own poll

            </Link>

          </div>

        )}

      </section>

    </main>

  );

}