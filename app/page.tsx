export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Poll = {
  id: number;
  question: string;
  description: string;
  category: string;
  created_at?: string;
};

type PollOption = {
  id: number;
  poll_id: number;
  option_text: string;
};

export default async function Home() {
  const { data: polls, error } = await supabase
    .from("polls")
    .select("*")
    .order("id", { ascending: true });

  const featuredPoll = polls?.[0];

  let featuredOptions: PollOption[] = [];
  let featuredVoteCounts: Record<number, number> = {};
  let totalSiteVotes = 0;

  const { data: allVotes } = await supabase.from("votes").select("id");
  totalSiteVotes = allVotes?.length || 0;

  if (featuredPoll) {
    const { data: optionsData } = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", featuredPoll.id)
      .order("id", { ascending: true });

    const { data: votesData } = await supabase
      .from("votes")
      .select("option_id")
      .eq("poll_id", featuredPoll.id);

    featuredOptions = optionsData || [];

    (votesData || []).forEach((vote) => {
      featuredVoteCounts[vote.option_id] =
        (featuredVoteCounts[vote.option_id] || 0) + 1;
    });
  }

  const totalFeaturedVotes = Object.values(featuredVoteCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">PollAndSee</h1>
          <p className="text-lg text-gray-300 mb-4">See what people really think</p>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-gray-200">
            <span className="font-semibold">{totalSiteVotes}</span>
            <span>total votes across the site</span>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-blue-300 bg-blue-500/10 px-3 py-1 rounded-full">
                Featured Poll
              </span>
              <span className="text-sm text-gray-400">
                {totalFeaturedVotes} votes
              </span>
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
                  {featuredOptions.map((option) => {
                    const count = featuredVoteCounts[option.id] || 0;
                    const percent =
                      totalFeaturedVotes > 0
                        ? Math.round((count / totalFeaturedVotes) * 100)
                        : 0;

                    const barColor =
                      option.option_text.toLowerCase() === "yes"
                        ? "bg-green-500"
                        : option.option_text.toLowerCase() === "no"
                        ? "bg-red-500"
                        : "bg-blue-500";

                    return (
                      <div key={option.id}>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>{option.option_text}</span>
                          <span>{percent}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                          <div
                            className={`${barColor} h-4`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Link
                  href={`/poll/${featuredPoll.id}`}
                  className="inline-block bg-white text-black px-5 py-3 rounded-xl font-medium hover:bg-gray-200 transition"
                >
                  Vote on featured poll
                </Link>
              </>
            ) : (
              <p className="text-gray-300">No polls found.</p>
            )}
          </div>

          <div className="bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-4">About</h3>
            <p className="text-gray-300 mb-4">
              Vote on real questions. Compare your answer. See how others think.
            </p>

            <div className="border-t border-gray-700 pt-4">
              <button className="w-full bg-white text-black py-3 rounded-xl font-medium hover:bg-gray-200 transition">
                Submit a Poll
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-2xl font-semibold">Live Polls</h3>
          <span className="text-sm text-gray-400">
            {polls?.length ?? 0} active polls
          </span>
        </div>

        {error && <p className="text-red-400 mb-4">Error loading polls.</p>}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {polls?.map((poll: Poll) => (
            <Link
              key={poll.id}
              href={`/poll/${poll.id}`}
              className="bg-gray-800 rounded-2xl p-5 shadow-lg transition border border-gray-700 hover:border-gray-500"
            >
              <div className="mb-3">
                <span className="text-xs text-blue-300 bg-blue-500/10 px-2 py-1 rounded-full">
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
          ))}
        </div>
      </section>
    </main>
  );
}