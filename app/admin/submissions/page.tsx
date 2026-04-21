"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PollSubmissionRow = {
  id: number;
  email: string | null;
  question: string;
  description: string | null;
  category: string | null;
  options: string[] | null;
  option_image_urls: string[] | null;
  is_private: boolean | null;
  slug: string | null;
  status: "pending" | "ready";
  created_at: string | null;
};

type CategoryOption =
  | "General"
  | "Lifestyle"
  | "Community"
  | "Finance"
  | "Business"
  | "Education"
  | "Fun";

const CATEGORY_OPTIONS: CategoryOption[] = [
  "General",
  "Lifestyle",
  "Community",
  "Finance",
  "Business",
  "Education",
  "Fun",
];

const ADMIN_KEY_STORAGE = "pollandsee-admin-key";

function createSlugFromQuestion(question: string) {
  return question
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isValidSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function getSlugError(slug: string, allPollSlugs: string[]) {
  const trimmed = slug.trim();

  if (!trimmed) return "Slug cannot be empty.";
  if (!isValidSlug(trimmed)) {
    return "Use lowercase letters, numbers and hyphens only.";
  }
  if (allPollSlugs.includes(trimmed)) {
    return "Slug already in use.";
  }

  return "";
}

export default function AdminSubmissionsPage() {
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [submissions, setSubmissions] = useState<PollSubmissionRow[]>([]);
  const [allPollSlugs, setAllPollSlugs] = useState<string[]>([]);
  const [questionEdits, setQuestionEdits] = useState<Record<number, string>>({});
  const [descriptionEdits, setDescriptionEdits] = useState<Record<number, string>>({});
  const [slugEdits, setSlugEdits] = useState<Record<number, string>>({});
  const [statusEdits, setStatusEdits] = useState<Record<number, "pending" | "ready">>({});
  const [categoryEdits, setCategoryEdits] = useState<Record<number, CategoryOption>>({});
  const [privacyEdits, setPrivacyEdits] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("pollandsee-admin-key") || "";
    if (saved) {
      setAdminKey(saved);
      setAdminKeyInput(saved);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (!adminKey) return;

    const loadSubmissions = async () => {
      setLoading(true);
      setError("");

      try {
        const url = new URL("/api/admin/poll-submissions", window.location.origin);
        if (searchTerm) {
          url.searchParams.set("q", searchTerm);
        }

        const response = await fetch(url.toString(), {
          headers: {
            "x-admin-key": adminKey,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load submissions.");
        }

        const nextSubmissions = data.submissions || [];
        setSubmissions(nextSubmissions);
        setAllPollSlugs(data.allPollSlugs || []);

        setQuestionEdits(
          Object.fromEntries(nextSubmissions.map((row: PollSubmissionRow) => [row.id, row.question]))
        );
        setDescriptionEdits(
          Object.fromEntries(
            nextSubmissions.map((row: PollSubmissionRow) => [row.id, row.description || ""])
          )
        );
        setSlugEdits(
          Object.fromEntries(
            nextSubmissions.map((row: PollSubmissionRow) => [
              row.id,
              row.slug || createSlugFromQuestion(row.question),
            ])
          )
        );
        setStatusEdits(
          Object.fromEntries(
            nextSubmissions.map((row: PollSubmissionRow) => [row.id, row.status || "pending"])
          )
        );
        setCategoryEdits(
          Object.fromEntries(
            nextSubmissions.map((row: PollSubmissionRow) => [
              row.id,
              (row.category as CategoryOption) || "General",
            ])
          )
        );
        setPrivacyEdits(
          Object.fromEntries(
            nextSubmissions.map((row: PollSubmissionRow) => [row.id, Boolean(row.is_private)])
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load submissions.");
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    void loadSubmissions();
  }, [adminKey, searchTerm]);

  const handleUnlock = () => {
    const trimmed = adminKeyInput.trim();
    if (!trimmed) return;
    sessionStorage.setItem(ADMIN_KEY_STORAGE, trimmed);
    setAdminKey(trimmed);
    setError("");
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    setAdminKey("");
    setAdminKeyInput("");
    setSubmissions([]);
    setQuestionEdits({});
    setDescriptionEdits({});
    setSlugEdits({});
    setStatusEdits({});
    setCategoryEdits({});
    setPrivacyEdits({});
    setError("");
  };

  const saveSubmission = async (submissionId: number) => {
    setSavingKey(`save:${submissionId}`);
    setError("");

    try {
      const response = await fetch(`/api/admin/poll-submissions/${submissionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          question: (questionEdits[submissionId] || "").trim(),
          description: (descriptionEdits[submissionId] || "").trim(),
          slug: (slugEdits[submissionId] || "").trim(),
          status: statusEdits[submissionId] || "pending",
          category: categoryEdits[submissionId] || "General",
          is_private: Boolean(privacyEdits[submissionId]),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save submission.");
      }

      setSubmissions((current) =>
        current.map((submission) =>
          submission.id === submissionId ? { ...submission, ...data.submission } : submission
        )
      );
      setSlugEdits((current) => ({
        ...current,
        [submissionId]: data.submission.slug || current[submissionId] || "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save submission.");
    } finally {
      setSavingKey("");
    }
  };

  const approveSubmission = async (submissionId: number) => {
    setSavingKey(`publish:${submissionId}`);
    setError("");

    try {
      const response = await fetch(`/api/admin/poll-submissions/${submissionId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          slug: (slugEdits[submissionId] || "").trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not publish submission.");
      }

      setSubmissions((current) => current.filter((submission) => submission.id !== submissionId));
      setAllPollSlugs((current) =>
        data.poll?.slug ? [...current, data.poll.slug].sort() : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish submission.");
    } finally {
      setSavingKey("");
    }
  };

  const deleteSubmission = async (submissionId: number) => {
    setSavingKey(`delete:${submissionId}`);
    setError("");

    try {
      const response = await fetch(`/api/admin/poll-submissions/${submissionId}`, {
        method: "DELETE",
        headers: {
          "x-admin-key": adminKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not delete submission.");
      }

      setSubmissions((current) => current.filter((submission) => submission.id !== submissionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete submission.");
    } finally {
      setSavingKey("");
    }
  };

  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [submissions]);

  if (!adminKey) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 px-6 py-10 text-white">
        <section className="mx-auto max-w-xl rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <h1 className="mb-2 text-2xl font-semibold">Submission Admin</h1>
          <p className="mb-5 text-sm text-gray-300">Enter your admin key to manage submissions.</p>

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
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 px-6 py-8 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Admin Submissions</h1>
            <p className="mt-1 text-sm text-gray-300">
              Review, prepare and manually publish poll submissions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex items-center gap-2">
              <Link
                href="/admin/polls"
                className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Polls
              </Link>
              <Link
                href="/admin/submissions"
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
              >
                Submissions
              </Link>
            </nav>

            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search submissions..."
              className="h-11 w-full min-w-[260px] rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500 md:w-[320px]"
            />

            <button
              type="button"
              onClick={handleLogout}
              className="h-11 rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Lock
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="overflow-auto rounded-2xl border border-gray-700 bg-gray-800 shadow-lg max-h-[78vh]">
          <table className="min-w-[1280px] text-sm">
            <thead className="sticky top-0 z-10 bg-gray-900/95 text-left text-gray-300">
              <tr>
                <th className="px-4 py-3 font-medium">Question / Description</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Category / Privacy / Status</th>
                <th className="px-4 py-3 font-medium">Options</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-300">
                    Loading submissions...
                  </td>
                </tr>
              ) : null}

              {!loading && sortedSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-300">
                    No submissions waiting.
                  </td>
                </tr>
              ) : null}

              {!loading &&
                sortedSubmissions.map((submission, index) => {
                  const slugError = getSlugError(slugEdits[submission.id] || "", allPollSlugs);

                  return (
                    <tr
                      key={submission.id}
                      className={`border-t border-gray-700 align-top ${
                        index % 2 === 0 ? "bg-gray-800" : "bg-gray-900/35"
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="min-w-[300px] max-w-[340px] space-y-2">
                          <input
                            type="text"
                            value={questionEdits[submission.id] ?? ""}
                            onChange={(event) =>
                              setQuestionEdits((current) => ({
                                ...current,
                                [submission.id]: event.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500"
                          />
                          <textarea
                            value={descriptionEdits[submission.id] ?? ""}
                            onChange={(event) =>
                              setDescriptionEdits((current) => ({
                                ...current,
                                [submission.id]: event.target.value,
                              }))
                            }
                            rows={3}
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500"
                          />
                          <p className="text-xs text-gray-400">
                            Submission ID {submission.id}
                            {submission.created_at
                              ? ` • ${new Date(submission.created_at).toLocaleString()}`
                              : ""}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-[220px] max-w-[240px] space-y-2">
                          <input
                            type="text"
                            value={slugEdits[submission.id] ?? ""}
                            onChange={(event) =>
                              setSlugEdits((current) => ({
                                ...current,
                                [submission.id]: event.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500"
                          />
                          {slugError ? (
                            <p className="text-xs text-amber-300">{slugError}</p>
                          ) : (
                            <p className="text-xs text-green-300">Slug available.</p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-[240px] space-y-2 text-xs text-gray-300">
                          <div className="space-y-1">
                            <span className="text-gray-400">Category</span>
                            <select
                              value={categoryEdits[submission.id] || "General"}
                              onChange={(event) =>
                                setCategoryEdits((current) => ({
                                  ...current,
                                  [submission.id]: event.target.value as CategoryOption,
                                }))
                              }
                              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white outline-none"
                            >
                              {CATEGORY_OPTIONS.map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <span className="text-gray-400">Privacy</span>
                            <button
                              type="button"
                              onClick={() =>
                                setPrivacyEdits((current) => ({
                                  ...current,
                                  [submission.id]: !current[submission.id],
                                }))
                              }
                              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                                privacyEdits[submission.id]
                                  ? "bg-white text-black hover:bg-gray-200"
                                  : "border border-gray-700 bg-gray-900 text-white hover:bg-gray-800"
                              }`}
                            >
                              {privacyEdits[submission.id] ? "Private" : "Public"}
                            </button>
                          </div>

                          <div className="space-y-1">
                            <span className="text-gray-400">Status</span>
                            <select
                              value={statusEdits[submission.id] || "pending"}
                              onChange={(event) =>
                                setStatusEdits((current) => ({
                                  ...current,
                                  [submission.id]: event.target.value as "pending" | "ready",
                                }))
                              }
                              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white outline-none"
                            >
                              <option value="pending">Pending</option>
                              <option value="ready">Ready</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <span className="text-gray-400">Email</span>
                            <p>{submission.email || "—"}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => void saveSubmission(submission.id)}
                            disabled={Boolean(slugError) || savingKey === `save:${submission.id}`}
                            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800 disabled:opacity-40"
                          >
                            Save edits
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-[260px] max-w-[300px] space-y-2">
                          {(submission.options || []).map((option, optionIndex) => (
                            <div
                              key={`${submission.id}-${optionIndex}`}
                              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-300"
                            >
                              <div>{option}</div>
                              {submission.option_image_urls?.[optionIndex] ? (
                                <div className="mt-1 break-all text-gray-500">
                                  {submission.option_image_urls[optionIndex]}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex min-w-[120px] flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => void approveSubmission(submission.id)}
                            disabled={Boolean(slugError) || savingKey === `publish:${submission.id}`}
                            className="rounded-lg bg-white px-3 py-2 text-left text-xs font-medium text-black transition hover:bg-gray-200 disabled:opacity-40"
                          >
                            Publish
                          </button>

                          <button
                            type="button"
                            onClick={() => void deleteSubmission(submission.id)}
                            disabled={savingKey === `delete:${submission.id}`}
                            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-left text-xs font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}