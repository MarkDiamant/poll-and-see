"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Poll = {
  id: number;
  question: string;
  description: string;
  category: string;
  slug: string;
  featured?: boolean;
};

type PollOption = {
  id: number;
  poll_id: number;
  option_text: string;
};

export default function Home() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [featuredOptions, setFeaturedOptions] = useState<PollOption[]>([]);
  const [featuredVoteCounts, setFeaturedVoteCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const loadHomeData = useCallback(async () => {
    setLoading(true);

    const { data: pollsData } = await supabase
      .from("polls")
      .select("id, question, description, category, slug, featured")
      .order("id", { ascending: true });

    const safePolls = pollsData || [];
    setPolls(safePolls);

    const chosenFeaturedPoll = safePolls.find((p) => p.featured) || safePolls[0];

    if (!chosenFeaturedPoll) {
      setFeaturedOptions([]);
      setFeaturedVoteCounts({});
      setLoading(false);
      return;
    }

    const { data: optionsData } = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", chosenFeaturedPoll.id)
      .order("id", { ascending: true });

    const { data: votesData } = await supabase
      .from("votes")
      .select("option_id")
      .eq("poll_id", chosenFeaturedPoll.id);

    const counts: Record<number, number> = {};
    (votesData || []).forEach((vote) => {
      counts[vote.option_id] = (counts[vote.option_id] || 0) + 1;
    });

    setFeaturedOptions(optionsData || []);
    setFeaturedVoteCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  useEffect(() => {
    const handleFocus = () => loadHomeData();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadHomeData();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadHomeData]);

  // ✅ SAVE scroll
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem("scrollPosition", String(window.scrollY));
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ RESTORE scroll
  useEffect(() => {
    const saved = sessionStorage.getItem("scrollPosition");
    if (saved) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(saved));
      }, 50);
    }
  }, [polls]);

  const featuredPoll = polls.find((p) => p.featured) || polls[0];

  const totalFeaturedVotes = Object.values(featuredVoteCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
        <section className="max-w-6xl mx-auto px-6 pt-10 pb-12">
          <p>Loading...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <header className="max-w-6xl mx-auto px-4 md:px-6 pt-5 pb-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0">
            <img
              src="/logo.png"
              alt="Poll & See"
              className="h-12 md:h-16 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/" className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-700 bg-gray-900 px-3 md:px-5 text-sm text-white hover:bg-gray-800">
              Home
            </Link>

            <Link href="/submit-poll" className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-3 md:px-5 text-sm text-white hover:bg-blue-500">
              Submit Poll
            </Link>
          </div>
        </div>
      </header>

      {/* rest of your UI stays EXACTLY the same */}
    </main>
  );
}