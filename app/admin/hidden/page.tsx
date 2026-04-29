"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HiddenPollRow = {
  id: number;
  poll_id: number | null;
  question: string;
  description: string | null;
  category: string | null;
  options: string[] | null;
  slug?: string | null;
  created_at: string | null;
};

const ADMIN_KEY_STORAGE = "pollandsee-admin-key";

export default function HiddenPage() {
  const [items, setItems] = useState<HiddenPollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHidden = async () => {
      try {
        const response = await fetch("/api/admin/hidden", {
          headers: {
            "x-admin-key": sessionStorage.getItem(ADMIN_KEY_STORAGE) || "",
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load hidden polls.");
        }

        setItems(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load hidden polls.");
      } finally {
        setLoading(false);
      }
    };

    void loadHidden();
  }, []);

  const makePublic = async (id: number) => {
    setSavingId(id);
    setError("");

    try {
      const response = await fetch(`/api/admin/poll-submissions/${id}/approve`, {
        method: "POST",
        headers: {
          "x-admin-key": sessionStorage.getItem(ADMIN_KEY_STORAGE) || "",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not make poll public.");
      }

      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not make poll public.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 px-6 py-8 text-white">
      <section className="mx-auto max-w-[1200px]">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Go to homepage">
              <img
                src="/logo.png"
                alt="Poll & See"
                className="block h-12 w-auto object-contain"
              />
            </Link>

            <div>
              <h1 className="text-3xl font-semibold">Hidden polls</h1>
              <p className="mt-1 text-sm text-gray-300">
                Polls hidden from the homepage and submissions queue.
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              href="/admin/polls"
              className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Live Polls
            </Link>

            <Link
              href="/admin/submissions"
              className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Submissions
            </Link>

            <Link
              href="/admin/hidden"
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
            >
              Hidden
            </Link>
          </nav>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500 bg-red-900 px-4 py-3 text-sm font-medium text-red-100">
            ⚠️ {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-lg">
          {loading ? (
            <div className="px-4 py-6 text-center text-gray-300">Loading hidden polls...</div>
          ) : null}

          {!loading && items.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-300">No hidden polls.</div>
          ) : null}

          {!loading && items.length > 0 ? (
            <div className="divide-y divide-gray-700">
              {items.map((item) => (
                <div key={item.id} className="grid gap-4 p-4 md:grid-cols-[1fr_180px]">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-gray-600 bg-gray-900 px-3 py-1 text-xs text-gray-200">
                        {item.category || "General"}
                      </span>

                      <span className="text-xs text-gray-400">
                        Submission ID {item.id}
                        {item.created_at
                          ? ` • ${new Date(item.created_at).toLocaleString()}`
                          : ""}
                      </span>
                    </div>

                    <h2 className="text-lg font-semibold text-white">{item.question}</h2>

                    {item.description ? (
                      <p className="text-sm text-gray-300">{item.description}</p>
                    ) : null}

                    {item.options?.length ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {item.options.map((option, index) => (
                          <span
                            key={`${item.id}-${index}`}
                            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-gray-200"
                          >
                            {option}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {item.slug ? (
                      <Link
                        href={`/poll/${item.slug}`}
                        target="_blank"
                        className="inline-block text-xs text-blue-300 hover:underline"
                      >
                        Open poll
                      </Link>
                    ) : null}
                  </div>

                  <div className="flex items-start md:justify-end">
                    <button
                      type="button"
                      onClick={() => void makePublic(item.id)}
                      disabled={savingId === item.id}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-200 disabled:opacity-40"
                    >
                      {savingId === item.id ? "Making public..." : "Make Public"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}