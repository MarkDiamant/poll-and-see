"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ScheduledSubmission = {
  id: number;
  question: string;
  description: string | null;
  category: string | null;
  slug: string | null;
  status: "pending" | "ready" | "scheduled";
  scheduled_publish_at: string | null;
  created_at: string | null;
};

const ADMIN_KEY_STORAGE = "pollandsee-admin-key";

function groupByDate(submissions: ScheduledSubmission[]) {
  const groups = new Map<string, ScheduledSubmission[]>();

  submissions.forEach((submission) => {
    if (!submission.scheduled_publish_at) return;

    const date = new Date(submission.scheduled_publish_at);
    const key = date.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    groups.set(key, [...(groups.get(key) || []), submission]);
  });

  return Array.from(groups.entries());
}

export default function AdminSchedulePage() {
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [submissions, setSubmissions] = useState<ScheduledSubmission[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
    if (saved) {
      setAdminKey(saved);
      setAdminKeyInput(saved);
    }
  }, []);

  useEffect(() => {
    if (!adminKey) return;

    const loadSchedule = async () => {
      setError("");

      const response = await fetch("/api/admin/poll-submissions", {
        headers: {
          "x-admin-key": adminKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not load schedule.");
        return;
      }

      setSubmissions(
        (data.submissions || [])
          .filter((submission: ScheduledSubmission) => submission.status === "scheduled")
          .filter((submission: ScheduledSubmission) => Boolean(submission.scheduled_publish_at))
      );
    };

    void loadSchedule();

    const interval = window.setInterval(loadSchedule, 8000);
    return () => window.clearInterval(interval);
  }, [adminKey]);

  const grouped = useMemo(() => {
    return groupByDate(
      [...submissions].sort((a, b) => {
        const aTime = a.scheduled_publish_at ? new Date(a.scheduled_publish_at).getTime() : 0;
        const bTime = b.scheduled_publish_at ? new Date(b.scheduled_publish_at).getTime() : 0;
        return aTime - bTime;
      })
    );
  }, [submissions]);

  const handleUnlock = () => {
    const trimmed = adminKeyInput.trim();
    if (!trimmed) return;
    localStorage.setItem(ADMIN_KEY_STORAGE, trimmed);
    setAdminKey(trimmed);
    setError("");
  };

  if (!adminKey) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 px-6 py-10 text-white">
        <section className="mx-auto max-w-xl rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <Link href="/" aria-label="Go to homepage">
            <img src="/logo.png" alt="Poll & See" className="mb-5 block h-12 w-auto object-contain" />
          </Link>

          <h1 className="mb-2 text-2xl font-semibold">Scheduled Polls</h1>
          <p className="mb-5 text-sm text-gray-300">Enter your admin key to view scheduled approvals.</p>

          <div className="space-y-3">
            <input
              type="password"
              value={adminKeyInput}
              onChange={(event) => setAdminKeyInput(event.target.value)}
              placeholder="Admin key"
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500"
            />

            <button
              type="button"
              onClick={handleUnlock}
              className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-gray-200"
            >
              Unlock
            </button>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 px-3 py-6 text-white md:px-6 md:py-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Go to homepage">
              <img src="/logo.png" alt="Poll & See" className="block h-12 w-auto object-contain" />
            </Link>

            <div>
              <h1 className="text-3xl font-semibold">Scheduled Polls</h1>
              <p className="mt-1 text-sm text-gray-300">Upcoming poll approvals.</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <Link href="/admin/polls" className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
              Live Polls
            </Link>
            <Link href="/admin/submissions" className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
              Submissions
            </Link>
            <Link href="/admin/schedule" className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">
              Scheduled
            </Link>
          </nav>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500 bg-red-900 px-4 py-3 text-sm font-medium text-red-100">
            ⚠️ {error}
          </div>
        ) : null}

        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 text-center text-gray-300">
            No scheduled polls yet.
          </div>
        ) : null}

        <div className="space-y-5">
          {grouped.map(([dateLabel, items]) => (
            <section key={dateLabel} className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
              <h2 className="mb-3 text-lg font-semibold">{dateLabel}</h2>

              <div className="space-y-2">
                {items.map((submission) => (
                  <Link
                    key={submission.id}
                    href="/admin/submissions"
                    className="block rounded-xl border border-gray-700 bg-gray-900 p-3 transition hover:bg-gray-800"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-[64px] shrink-0 text-sm font-semibold text-blue-300">
                        {submission.scheduled_publish_at
                          ? new Date(submission.scheduled_publish_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{submission.question}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {submission.category || "General"} · Submission ID {submission.id}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}