"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_OPTIONS, suggestCategoryFromQuestion, type CategoryOption } from "@/lib/categories";

type PollSubmissionRow = {
  id: number;
  poll_id: number | null;
  email: string | null;
  question: string;
  description: string | null;
  category: string | null;
  options: string[] | null;
  option_image_urls: string[] | null;
  is_private: boolean | null;
  slug: string | null;
  status: "pending" | "ready" | "scheduled";
  scheduled_publish_at: string | null;
  created_at: string | null;
};

const ADMIN_KEY_STORAGE = "pollandsee-admin-key";

function badge(count: number, isActive: boolean) {
  return (
    <span
      className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
        isActive ? "bg-black/10 text-black" : "bg-white/10 text-white"
      }`}
    >
      {count}
    </span>
  );
}

function formatDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function isNewSubmission(createdAt: string | null) {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() <= 24 * 60 * 60 * 1000;
}

export default function AdminSubmissionsPage() {
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [privacyFilter, setPrivacyFilter] = useState<"all" | "public" | "private">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | CategoryOption>("all");
  const [scheduleFilter, setScheduleFilter] = useState<"all" | "unscheduled" | "scheduled">("all");
  const [submissions, setSubmissions] = useState<PollSubmissionRow[]>([]);
  const [livePollCount, setLivePollCount] = useState(0);
  const [hiddenPollCount, setHiddenPollCount] = useState(0);
  const [questionEdits, setQuestionEdits] = useState<Record<number, string>>({});
  const [descriptionEdits, setDescriptionEdits] = useState<Record<number, string>>({});
  const [optionsEdits, setOptionsEdits] = useState<Record<number, string>>({});
  const [imageUrlEdits, setImageUrlEdits] = useState<Record<number, string>>({});
  const [emailEdits, setEmailEdits] = useState<Record<number, string>>({});
  const [categoryEdits, setCategoryEdits] = useState<Record<number, CategoryOption>>({});
  const [privacyEdits, setPrivacyEdits] = useState<Record<number, boolean>>({});
  const [scheduledPublishEdits, setScheduledPublishEdits] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [showTopButton, setShowTopButton] = useState(false);
const savingKeyRef = useRef("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<CategoryOption>("General");
  const [newIsPrivate, setNewIsPrivate] = useState(false);
  const [newOptions, setNewOptions] = useState("");
  const [newImageUrls, setNewImageUrls] = useState("");
  const [creatingSubmission, setCreatingSubmission] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<number[]>([]);
  const [bulkScheduleAt, setBulkScheduleAt] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
    if (saved) {
      setAdminKey(saved);
      setAdminKeyInput(saved);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowTopButton(window.scrollY > 500);
    };

    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

useEffect(() => {
  savingKeyRef.current = savingKey;
}, [savingKey]);

useEffect(() => {
  if (!adminKey) return;

  let isCancelled = false;

  const loadSubmissions = async (showSpinner = true) => {
      if (showSpinner) {
  setLoading(true);
}
      setError("");

      try {
        const url = new URL("/api/admin/poll-submissions", window.location.origin);
        if (searchInput.trim()) {
          url.searchParams.set("q", searchInput.trim());
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
        if (isCancelled) return;
setSubmissions(nextSubmissions);
        setLivePollCount(data.livePollCount || 0);

        const hiddenResponse = await fetch("/api/admin/hidden", {
          headers: {
            "x-admin-key": adminKey,
          },
        });

        if (hiddenResponse.ok) {
          const hiddenData = await hiddenResponse.json();
          setHiddenPollCount((hiddenData.items || []).length);
        }

        if (showSpinner) {
          setQuestionEdits(
            Object.fromEntries(nextSubmissions.map((row: PollSubmissionRow) => [row.id, row.question]))
          );
          setDescriptionEdits(
            Object.fromEntries(nextSubmissions.map((row: PollSubmissionRow) => [row.id, row.description || ""]))
          );
          setOptionsEdits(
            Object.fromEntries(
              nextSubmissions.map((row: PollSubmissionRow) => [row.id, (row.options || []).join("\n")])
            )
          );
          setImageUrlEdits(
            Object.fromEntries(
              nextSubmissions.map((row: PollSubmissionRow) => [row.id, (row.option_image_urls || []).join("\n")])
            )
          );
          setEmailEdits(
            Object.fromEntries(nextSubmissions.map((row: PollSubmissionRow) => [row.id, row.email || ""]))
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
          setScheduledPublishEdits(
            Object.fromEntries(
              nextSubmissions.map((row: PollSubmissionRow) => [
                row.id,
                formatDateTimeLocal(row.scheduled_publish_at),
              ])
            )
          );
        } else {
          setQuestionEdits((current) => {
            const next = { ...current };
            nextSubmissions.forEach((row: PollSubmissionRow) => {
              if (next[row.id] === undefined) next[row.id] = row.question;
            });
            return next;
          });

          setDescriptionEdits((current) => {
            const next = { ...current };
            nextSubmissions.forEach((row: PollSubmissionRow) => {
              if (next[row.id] === undefined) next[row.id] = row.description || "";
            });
            return next;
          });

          setOptionsEdits((current) => {
            const next = { ...current };
            nextSubmissions.forEach((row: PollSubmissionRow) => {
              if (next[row.id] === undefined) next[row.id] = (row.options || []).join("\n");
            });
            return next;
          });

          setImageUrlEdits((current) => {
            const next = { ...current };
            nextSubmissions.forEach((row: PollSubmissionRow) => {
              if (next[row.id] === undefined) next[row.id] = (row.option_image_urls || []).join("\n");
            });
            return next;
          });

          setEmailEdits((current) => {
            const next = { ...current };
            nextSubmissions.forEach((row: PollSubmissionRow) => {
              if (next[row.id] === undefined) next[row.id] = row.email || "";
            });
            return next;
          });

          setCategoryEdits((current) => {
            const next = { ...current };
            nextSubmissions.forEach((row: PollSubmissionRow) => {
              if (next[row.id] === undefined) next[row.id] = (row.category as CategoryOption) || "General";
            });
            return next;
          });

          setPrivacyEdits((current) => {
            const next = { ...current };
            nextSubmissions.forEach((row: PollSubmissionRow) => {
              if (next[row.id] === undefined) next[row.id] = Boolean(row.is_private);
            });
            return next;
          });

          setScheduledPublishEdits((current) => {
            const next = { ...current };
            nextSubmissions.forEach((row: PollSubmissionRow) => {
              if (next[row.id] === undefined) next[row.id] = formatDateTimeLocal(row.scheduled_publish_at);
            });
            return next;
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load submissions.");
        setSubmissions([]);
      } finally {
  if (!isCancelled && showSpinner) {
    setLoading(false);
  }
}
    };

    void loadSubmissions(true);

const refreshInterval = window.setInterval(() => {
  if (!savingKeyRef.current && !creatingSubmission) {
    void loadSubmissions(false);
  }
}, 8000);

return () => {
  isCancelled = true;
  window.clearInterval(refreshInterval);
};
}, [adminKey, searchInput, creatingSubmission]);

  const handleUnlock = () => {
    const trimmed = adminKeyInput.trim();
    if (!trimmed) return;
    localStorage.setItem(ADMIN_KEY_STORAGE, trimmed);
    setAdminKey(trimmed);
    setError("");
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    setAdminKey("");
    setAdminKeyInput("");
    setSubmissions([]);
    setLivePollCount(0);
    setQuestionEdits({});
    setDescriptionEdits({});
    setOptionsEdits({});
    setImageUrlEdits({});
    setEmailEdits({});
    setCategoryEdits({});
    setPrivacyEdits({});
    setScheduledPublishEdits({});
    setError("");
  };

  const handleNewQuestionChange = (value: string) => {
    setNewQuestion(value);
    setNewCategory(value.trim() ? suggestCategoryFromQuestion(value) : "General");
  };

   const saveSubmission = async (
    submissionId: number,
    overrides: Partial<{
      question: string;
      description: string;
      category: CategoryOption;
      is_private: boolean;
      email: string;
      options: string[];
      option_image_urls: string[];
      status: "pending" | "ready" | "scheduled" | "hidden";
      scheduled_publish_at: string | null;
    }> = {}
  ) => {
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
          question: ((overrides.question ?? questionEdits[submissionId]) || "").trim(),
          description: ((overrides.description ?? descriptionEdits[submissionId]) || "").trim(),
          category: overrides.category ?? categoryEdits[submissionId] ?? "General",
          is_private: overrides.is_private ?? Boolean(privacyEdits[submissionId]),
                    email: ((overrides.email ?? emailEdits[submissionId]) || "").trim(),
          options: overrides.options ?? (optionsEdits[submissionId] || "")
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          option_image_urls:
            overrides.option_image_urls ??
            (imageUrlEdits[submissionId] || "")
              .split("\n")
              .map((item) => item.trim()),
          ...(overrides.status ? { status: overrides.status } : {}),
          ...("scheduled_publish_at" in overrides
            ? { scheduled_publish_at: overrides.scheduled_publish_at }
            : {}),
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save submission.");
    } finally {
      setSavingKey("");
    }
  };

  const scheduleSubmission = async (submissionId: number) => {
    const value = scheduledPublishEdits[submissionId];

    if (!value) {
      setError("Choose a schedule date and time first.");
      return;
    }

    setSavingKey(`schedule:${submissionId}`);
    setError("");

    try {
      await saveSubmission(submissionId, {
        status: "scheduled",
        scheduled_publish_at: new Date(value).toISOString(),
      });
    } finally {
      setSavingKey("");
    }
  };

  const bulkScheduleSubmissions = async () => {
    if (selectedSubmissionIds.length === 0) {
      setError("Select at least one submission first.");
      return;
    }

    if (!bulkScheduleAt) {
      setError("Choose a bulk schedule date and time first.");
      return;
    }

    setSavingKey("bulk-schedule");
    setError("");

    try {
      await Promise.all(
        selectedSubmissionIds.map((submissionId) =>
          saveSubmission(submissionId, {
            status: "scheduled",
            scheduled_publish_at: new Date(bulkScheduleAt).toISOString(),
          })
        )
      );

      setSelectedSubmissionIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not bulk schedule submissions.");
    } finally {
      setSavingKey("");
    }
  };

  const approveSubmission = async (submissionId: number) => {
    setSavingKey(`approve:${submissionId}`);
    setError("");

    try {
      const response = await fetch(`/api/admin/poll-submissions/${submissionId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not approve submission.");
      }

      setSubmissions((current) => current.filter((submission) => submission.id !== submissionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve submission.");
    } finally {
      setSavingKey("");
    }
  };

const createSubmission = async () => {
    setCreatingSubmission(true);
    setError("");
    setCreateError("");

    try {
      const response = await fetch("/api/admin/poll-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          question: newQuestion.trim(),
          description: newDescription.trim(),
          category: newCategory,
          is_private: newIsPrivate,
          options: newOptions
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          option_image_urls: newImageUrls.trim()
  ? newImageUrls
      .split("\n")
      .map((item) => item.trim())
  : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create submission.");
      }

      setSubmissions((current) => [data.submission, ...current]);
      setLivePollCount((current) => current + 1);
      setQuestionEdits((current) => ({ ...current, [data.submission.id]: data.submission.question }));
      setDescriptionEdits((current) => ({ ...current, [data.submission.id]: data.submission.description || "" }));
      setOptionsEdits((current) => ({
        ...current,
        [data.submission.id]: (data.submission.options || []).join("\n"),
      }));
      setImageUrlEdits((current) => ({
        ...current,
        [data.submission.id]: (data.submission.option_image_urls || []).join("\n"),
      }));
      setEmailEdits((current) => ({ ...current, [data.submission.id]: data.submission.email || "" }));
      setCategoryEdits((current) => ({
        ...current,
        [data.submission.id]: (data.submission.category as CategoryOption) || "General",
      }));
      setPrivacyEdits((current) => ({
        ...current,
        [data.submission.id]: Boolean(data.submission.is_private),
      }));
      setScheduledPublishEdits((current) => ({
        ...current,
        [data.submission.id]: formatDateTimeLocal(data.submission.scheduled_publish_at),
      }));

      setNewQuestion("");
      setNewDescription("");
      setNewCategory("General");
      setNewIsPrivate(false);
      setNewOptions("");
      setNewImageUrls("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create submission.";
      setError(message);
      setCreateError(message);
    } finally {
      setCreatingSubmission(false);
    }
  };
const hideSubmission = async (submissionId: number) => {
  setSavingKey(`hide:${submissionId}`);
  setError("");

  try {
    const response = await fetch(`/api/admin/poll-submissions/${submissionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({
        status: "hidden",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not hide submission.");
    }

    setSubmissions((current) =>
      current.filter((submission) => submission.id !== submissionId)
    );
  } catch (err) {
    setError(err instanceof Error ? err.message : "Could not hide submission.");
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
    return [...submissions]
      .filter((s) => {
        if (privacyFilter === "public" && s.is_private) return false;
        if (privacyFilter === "private" && !s.is_private) return false;
        if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
        if (scheduleFilter === "scheduled" && s.status !== "scheduled") return false;
        if (scheduleFilter === "unscheduled" && s.status === "scheduled") return false;
        return true;
      })
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });
  }, [submissions, privacyFilter, categoryFilter, scheduleFilter]);

  if (!adminKey) {
    return (
      <main className="min-h-screen w-full bg-gradient-to-b from-black to-gray-900 px-4 py-6 text-white">
        <section className="mx-auto max-w-xl rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <div className="mb-5 flex items-center gap-3">
            <Link href="/" aria-label="Go to homepage">
              <img
                src="/logo.png"
                alt="Poll & See"
                className="block h-12 w-auto object-contain"
              />
            </Link>
          </div>

          <h1 className="mb-2 text-2xl font-semibold">Admin</h1>
          <p className="mb-5 text-sm text-gray-300">Enter your admin key to manage polls and submissions.</p>

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
    <main className="min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-black to-gray-900 px-3 py-6 text-white md:px-6 md:py-8">
      <section className="mx-auto w-full max-w-[1500px] overflow-x-hidden">
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
              <h1 className="text-3xl font-semibold">Admin</h1>
              <p className="mt-1 text-sm text-gray-300">Review submissions and manage live polls.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex items-center gap-2 overflow-x-auto whitespace-nowrap max-w-full">
              <Link
                href="/admin/polls"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                <span>Live Polls</span>
                {badge(livePollCount, false)}
              </Link>
              <Link
                href="/admin/submissions"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
              >
                <span>Submissions</span>
                {badge(sortedSubmissions.length, true)}
              </Link>
<Link
  href="/admin/schedule"
  className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
>
  <span>Scheduled</span>
</Link>

<Link
  href="/admin/hidden"
  className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
>
  <span>Hidden</span>
  {badge(hiddenPollCount, false)}
</Link>

<Link
  href="/admin/sponsors"
  className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
>
  <span>Advertisers</span>
</Link>

<Link
  href="/admin/advertiser-enquiries"
  className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
>
  <span>Enquiries</span>
</Link>
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="h-11 rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Lock
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-gray-700 bg-gray-800 p-4">
          <h2 className="mb-3 text-sm font-medium text-white">Create submission</h2>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs text-gray-400">Question</p>
                <input
                  value={newQuestion}
                  onChange={(event) => handleNewQuestionChange(event.target.value)}
                  placeholder="Question"
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500"
                />
              </div>

              <div>
                <p className="mb-1 text-xs text-gray-400">Description</p>
                <textarea
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  rows={1}
                  placeholder="Description"
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500 resize-none overflow-y-auto"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs text-gray-400">Category</p>
                  <select
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value as CategoryOption)}
                    className="h-10 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none"
                  >
                    {CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="mb-1 text-xs text-gray-400">Privacy</p>
                  <button
                    type="button"
                    onClick={() => setNewIsPrivate((current) => !current)}
                    className={`h-10 w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      newIsPrivate
                        ? "bg-white text-black hover:bg-gray-200"
                        : "border border-gray-700 bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                  >
                    {newIsPrivate ? "Private" : "Public"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1.4fr_0.9fr]">
              <div>
                <p className="mb-1 text-xs text-gray-400">Options (one per line)</p>
                <textarea
                  value={newOptions}
                  onChange={(event) => setNewOptions(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500 resize-none overflow-y-auto"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs text-gray-400">Image URLs (optional)</p>
                  <textarea
                    value={newImageUrls}
                    onChange={(event) => setNewImageUrls(event.target.value)}
                    rows={1}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500 resize-none overflow-y-auto"
                  />
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => void createSubmission()}
                    disabled={creatingSubmission}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-200 disabled:opacity-40"
                  >
                    {creatingSubmission ? "Creating..." : "Create submission"}
                  </button>

                  {createError ? (
                    <p className="rounded-lg border border-red-500 bg-red-900 px-3 py-2 text-sm font-medium text-red-100">
                      ⚠️ {createError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-gray-700 bg-gray-800 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-1 text-sm font-medium text-white">Bulk schedule selected polls</p>
              <p className="text-xs text-gray-400">
                {selectedSubmissionIds.length} selected
              </p>
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap">
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search submissions..."
                className="h-10 min-w-[260px] rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500"
              />

              <select
                value={privacyFilter}
                onChange={(event) => setPrivacyFilter(event.target.value as "all" | "public" | "private")}
                className="h-10 rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-white outline-none"
              >
                <option value="all">All privacy</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as "all" | CategoryOption)}
                className="h-10 rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-white outline-none"
              >
                <option value="all">All categories</option>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={scheduleFilter}
                onChange={(event) =>
                  setScheduleFilter(event.target.value as "all" | "unscheduled" | "scheduled")
                }
                className="h-10 rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-white outline-none"
              >
                <option value="all">All schedule status</option>
                <option value="unscheduled">Unscheduled only</option>
                <option value="scheduled">Scheduled only</option>
              </select>

              <input
                type="datetime-local"
                value={bulkScheduleAt}
                onClick={(event) => event.currentTarget.showPicker?.()}
                onFocus={(event) => event.currentTarget.showPicker?.()}
                onChange={(event) => setBulkScheduleAt(event.target.value)}
                className="h-10 cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-white outline-none [color-scheme:dark]"
              />

              <button
                type="button"
                onClick={() => void bulkScheduleSubmissions()}
                disabled={savingKey === "bulk-schedule"}
                className="h-10 cursor-pointer rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                Schedule selected
              </button>

              <button
                type="button"
                onClick={() => setSelectedSubmissionIds([])}
                className="h-10 cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

{error ? (
  <div className="mb-4 rounded-xl border border-red-500 bg-red-900 px-4 py-3 text-sm text-red-100 font-medium">
    ⚠️ {error}
  </div>
) : null}

        <div className="space-y-4 md:hidden w-full overflow-x-hidden">
          {loading ? (
            <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5 text-center text-sm text-gray-300">
              Loading submissions...
            </div>
          ) : null}

          {!loading && sortedSubmissions.length === 0 ? (
            <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5 text-center text-sm text-gray-300">
              No submissions waiting.
            </div>
          ) : null}

          {!loading &&
            sortedSubmissions.map((submission) => (
              <div key={submission.id} className="rounded-2xl border border-gray-700 bg-gray-800 p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={selectedSubmissionIds.includes(submission.id)}
                      onChange={(event) => {
                        setSelectedSubmissionIds((current) =>
                          event.target.checked
                            ? [...current, submission.id]
                            : current.filter((id) => id !== submission.id)
                        );
                      }}
                    />
                    Select
                  </label>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400">Submission ID {submission.id}</p>
                    {submission.created_at ? (
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {new Date(submission.created_at).toLocaleString()}
                      </p>
                    ) : null}
                  </div>

                  {isNewSubmission(submission.created_at) ? (
                    <span className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-black">
                      NEW
                    </span>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-xs text-gray-400">Question</p>
<textarea
  value={questionEdits[submission.id] ?? ""}
  onChange={(event) =>
    setQuestionEdits((current) => ({
      ...current,
      [submission.id]: event.target.value,
    }))
  }
  onBlur={() => void saveSubmission(submission.id)}
  rows={2}
  className="w-full resize-none overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500"
/>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-gray-400">Description</p>
                    <textarea
                      value={descriptionEdits[submission.id] ?? ""}
                      onChange={(event) =>
                        setDescriptionEdits((current) => ({
                          ...current,
                          [submission.id]: event.target.value,
                        }))
                      }
                      onBlur={() => void saveSubmission(submission.id)}
                      rows={1}
                      className="w-full resize-none overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500"
                    />
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-gray-400">Options</p>
                    <textarea
                      value={optionsEdits[submission.id] ?? ""}
                      onChange={(event) =>
                        setOptionsEdits((current) => ({
                          ...current,
                          [submission.id]: event.target.value,
                        }))
                      }
                      onBlur={(event) => {
                        const nextOptions = event.target.value
                          .split("\n")
                          .map((item) => item.trim())
                          .filter(Boolean);

                        const nextImageUrls = (imageUrlEdits[submission.id] || "")
                          .split("\n")
                          .map((item) => item.trim())
                          .slice(0, nextOptions.length);

                        setOptionsEdits((current) => ({
                          ...current,
                          [submission.id]: nextOptions.join("\n"),
                        }));

                        setImageUrlEdits((current) => ({
                          ...current,
                          [submission.id]: nextImageUrls.join("\n"),
                        }));

                        void saveSubmission(submission.id, {
                          options: nextOptions,
                          option_image_urls: nextImageUrls,
                        });
                      }}
                      rows={3}
className="w-full resize-none overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500 min-h-[90px]"
                    />
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-gray-400">Image URLs</p>
                    <textarea
                      value={imageUrlEdits[submission.id] ?? ""}
                      onChange={(event) =>
                        setImageUrlEdits((current) => ({
                          ...current,
                          [submission.id]: event.target.value,
                        }))
                      }
                      onBlur={() => void saveSubmission(submission.id)}
                      rows={1}
                      className="w-full resize-none overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500 h-[38px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="mb-1 text-xs text-gray-400">Category</p>
                      <select
                        value={categoryEdits[submission.id] || "General"}
                        onChange={(event) => {
                          const nextCategory = event.target.value as CategoryOption;

                          setCategoryEdits((current) => ({
                            ...current,
                            [submission.id]: nextCategory,
                          }));

                          void saveSubmission(submission.id, { category: nextCategory });
                        }}
                        className="h-10 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 text-xs text-white outline-none"
                      >
                        {CATEGORY_OPTIONS.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <p className="mb-1 text-xs text-gray-400">Privacy</p>
                      <button
                        type="button"
                        onClick={() => {
                          const nextPrivate = !privacyEdits[submission.id];
                          setPrivacyEdits((current) => ({
                            ...current,
                            [submission.id]: nextPrivate,
                          }));
                          void saveSubmission(submission.id, { is_private: nextPrivate });
                        }}
                        className={`h-10 w-full rounded-lg px-2 text-left text-xs font-medium transition ${
                          privacyEdits[submission.id]
                            ? "bg-white text-black hover:bg-gray-200"
                            : "border border-gray-700 bg-gray-900 text-white hover:bg-gray-800"
                        }`}
                      >
                        {privacyEdits[submission.id] ? "Private" : "Public"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-gray-400">Email</p>
                    <input
                      type="text"
                      value={emailEdits[submission.id] ?? ""}
                      onChange={(event) =>
                        setEmailEdits((current) => ({
                          ...current,
                          [submission.id]: event.target.value,
                        }))
                      }
                      onBlur={() => void saveSubmission(submission.id)}
                      className="h-10 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-white outline-none transition focus:border-gray-500"
                      placeholder="No email"
                    />
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-gray-400">Schedule approval</p>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input
                        type="datetime-local"
                        value={scheduledPublishEdits[submission.id] || ""}
                        onClick={(event) => event.currentTarget.showPicker?.()}
                        onFocus={(event) => event.currentTarget.showPicker?.()}
                        onChange={(event) =>
                          setScheduledPublishEdits((current) => ({
                            ...current,
                            [submission.id]: event.target.value,
                          }))
                        }
                        className="h-10 w-full cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-2 text-xs text-white outline-none [color-scheme:dark]"
                      />

                      <button
                        type="button"
                        onClick={() => void scheduleSubmission(submission.id)}
                        disabled={savingKey === `schedule:${submission.id}`}
                        className="cursor-pointer rounded-lg border border-blue-600 bg-blue-900 px-3 py-2 text-xs font-medium text-blue-100 transition hover:bg-blue-800 disabled:opacity-60"
                      >
                        Schedule
                      </button>
                    </div>

                    {submission.status === "scheduled" && submission.scheduled_publish_at ? (
                      <p className="mt-1 text-xs text-blue-300">
                        Scheduled for {new Date(submission.scheduled_publish_at).toLocaleString()}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <a
                      href={submission.slug ? `/poll/${submission.slug}` : "#"}
                      target="_blank"
                      rel="noreferrer"
                      className={`rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-center text-xs font-medium text-white transition hover:bg-gray-800 ${
                        !submission.slug ? "pointer-events-none opacity-40" : ""
                      }`}
                    >
                      Open poll
                    </a>

                    <button
                      type="button"
                      onClick={() => void approveSubmission(submission.id)}
                      disabled={savingKey === `approve:${submission.id}`}
                      className="cursor-pointer rounded-lg bg-white px-3 py-2 text-xs font-medium text-black transition hover:bg-gray-200 disabled:opacity-40"
                    >
                      Approve
                    </button>

                    <button
                      type="button"
                      onClick={() => void hideSubmission(submission.id)}
                      disabled={savingKey === `hide:${submission.id}`}
                      className="cursor-pointer rounded-lg border border-yellow-600 bg-yellow-900 px-3 py-2 text-xs font-medium text-yellow-100 transition hover:bg-yellow-800 disabled:opacity-60"
                    >
                      Hide
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteSubmission(submission.id)}
                      disabled={savingKey === `delete:${submission.id}`}
                      className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div className="hidden overflow-x-auto rounded-2xl border border-gray-700 bg-gray-800 shadow-lg md:block">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-900/95 text-left text-gray-300">
              <tr>
                <th className="px-4 py-3 font-medium">
                  <input
                    type="checkbox"
                    checked={
                      sortedSubmissions.length > 0 &&
                      sortedSubmissions.every((submission) =>
                        selectedSubmissionIds.includes(submission.id)
                      )
                    }
                    onChange={(event) => {
                      setSelectedSubmissionIds(
                        event.target.checked ? sortedSubmissions.map((submission) => submission.id) : []
                      );
                    }}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Poll</th>
                <th className="px-4 py-3 font-medium">Options / Images</th>
                <th className="px-4 py-3 font-medium">Settings</th>
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
                sortedSubmissions.map((submission, index) => (
                  <tr
                    key={submission.id}
                    className={`border-t border-gray-700 align-top ${
                      index % 2 === 0 ? "bg-gray-800" : "bg-black/40"
                    }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedSubmissionIds.includes(submission.id)}
                        onChange={(event) => {
                          setSelectedSubmissionIds((current) =>
                            event.target.checked
                              ? [...current, submission.id]
                              : current.filter((id) => id !== submission.id)
                          );
                        }}
                      />
                    </td>

                    <td className="px-4 py-4">
                      <div className="min-w-[380px] max-w-[460px] space-y-2">
                        <input
                          type="text"
                          value={questionEdits[submission.id] ?? ""}
                          onChange={(event) =>
                            setQuestionEdits((current) => ({
                              ...current,
                              [submission.id]: event.target.value,
                            }))
                          }
                          onBlur={() => void saveSubmission(submission.id)}
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
                          onBlur={() => void saveSubmission(submission.id)}
                          rows={1}
                          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500 resize-none overflow-y-auto"
                        />

                        <p className="text-xs text-gray-400">
                          Submission ID {submission.id}
                          {isNewSubmission(submission.created_at) ? (
                            <span className="ml-2 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-black">
                              NEW
                            </span>
                          ) : null}
                          {submission.created_at
                            ? ` • ${new Date(submission.created_at).toLocaleString()}`
                            : ""}
                          {submission.slug ? ` • /poll/${submission.slug}` : " • no live link yet"}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="min-w-[220px] max-w-[260px] space-y-2">
                        <div>
<p className="mb-1 text-xs text-gray-400">Options (one per line)</p>
<textarea
  value={optionsEdits[submission.id] ?? ""}
  onChange={(event) =>
    setOptionsEdits((current) => ({
      ...current,
      [submission.id]: event.target.value,
    }))
  }
  onBlur={(event) => {
    const nextOptions = event.target.value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const nextImageUrls = (imageUrlEdits[submission.id] || "")
      .split("\n")
      .map((item) => item.trim())
      .slice(0, nextOptions.length);

    setOptionsEdits((current) => ({
      ...current,
      [submission.id]: nextOptions.join("\n"),
    }));

    setImageUrlEdits((current) => ({
      ...current,
      [submission.id]: nextImageUrls.join("\n"),
    }));

    void saveSubmission(submission.id, {
      options: nextOptions,
      option_image_urls: nextImageUrls,
    });
  }}
  rows={3}
  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white outline-none transition focus:border-gray-500 resize-none overflow-y-auto"
/>
                        </div>

                        <div>
                          <p className="mb-1 text-xs text-gray-400">Image URLs (one per line, optional)</p>
                          <textarea
                            value={imageUrlEdits[submission.id] ?? ""}
                            onChange={(event) =>
                              setImageUrlEdits((current) => ({
                                ...current,
                                [submission.id]: event.target.value,
                              }))
                            }
                            onBlur={() => void saveSubmission(submission.id)}
                            rows={1}
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white outline-none transition focus:border-gray-500 resize-none overflow-y-auto"
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="min-w-[170px] grid grid-cols-2 gap-2 text-xs text-gray-300">
                        <div className="space-y-1">
                          <span className="text-gray-400">Category</span>
                          <select
  value={categoryEdits[submission.id] || "General"}
  onChange={(event) => {
    const nextCategory = event.target.value as CategoryOption;

    setCategoryEdits((current) => ({
      ...current,
      [submission.id]: nextCategory,
    }));

    void saveSubmission(submission.id, { category: nextCategory });
  }}
  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-white outline-none"
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
                            onClick={() => {
                              const nextPrivate = !privacyEdits[submission.id];
                              setPrivacyEdits((current) => ({
                                ...current,
                                [submission.id]: nextPrivate,
                              }));
                              void saveSubmission(submission.id, { is_private: nextPrivate });
                            }}
                            className={`w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition ${
                              privacyEdits[submission.id]
                                ? "bg-white text-black hover:bg-gray-200"
                                : "border border-gray-700 bg-gray-900 text-white hover:bg-gray-800"
                            }`}
                          >
                            {privacyEdits[submission.id] ? "Private" : "Public"}
                          </button>
                        </div>

                        <div className="col-span-2 space-y-1">
                          <span className="text-gray-400">Email</span>
                          <input
                            type="text"
                            value={emailEdits[submission.id] ?? ""}
                            onChange={(event) =>
                              setEmailEdits((current) => ({
                                ...current,
                                [submission.id]: event.target.value,
                              }))
                            }
                            onBlur={() => void saveSubmission(submission.id)}
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white outline-none transition focus:border-gray-500"
                            placeholder="No email"
                          />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <span className="text-gray-400">Schedule approval</span>
                          <input
                            type="datetime-local"
                            value={scheduledPublishEdits[submission.id] || ""}
                            onClick={(event) => event.currentTarget.showPicker?.()}
                            onFocus={(event) => event.currentTarget.showPicker?.()}
                            onChange={(event) =>
                              setScheduledPublishEdits((current) => ({
                                ...current,
                                [submission.id]: event.target.value,
                              }))
                            }
                            className="w-full cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white outline-none [color-scheme:dark]"
                          />

                          {submission.status === "scheduled" && submission.scheduled_publish_at ? (
                            <p className="text-xs text-blue-300">
                              Scheduled for {new Date(submission.scheduled_publish_at).toLocaleString()}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex min-w-[90px] flex-col gap-1.5">

                        <a
                          href={submission.slug ? `/poll/${submission.slug}` : "#"}
                          target="_blank"
                          rel="noreferrer"
                          className={`rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-left text-xs font-medium text-white transition hover:bg-gray-800 ${
                            !submission.slug ? "pointer-events-none opacity-40" : ""
                          }`}
                        >
                          Open poll
                        </a>

                        <button
                          type="button"
                          onClick={() => void approveSubmission(submission.id)}
                          disabled={savingKey === `approve:${submission.id}`}
                          className="cursor-pointer rounded-lg bg-white px-2 py-1.5 text-left text-xs font-medium text-black transition hover:bg-gray-200 disabled:opacity-40"
                        >
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={() => void scheduleSubmission(submission.id)}
                          disabled={savingKey === `schedule:${submission.id}`}
                          className="cursor-pointer rounded-lg border border-blue-600 bg-blue-900 px-2 py-1.5 text-left text-xs font-medium text-blue-100 transition hover:bg-blue-800 disabled:opacity-60"
                        >
                          Schedule
                        </button>

<button
  type="button"
  onClick={() => void hideSubmission(submission.id)}
  disabled={savingKey === `hide:${submission.id}`}
  className="cursor-pointer rounded-lg border border-yellow-600 bg-yellow-900 px-2 py-1.5 text-left text-xs font-medium text-yellow-100 transition hover:bg-yellow-800 disabled:opacity-60"
>
  Hide
</button>
<button
  type="button"
  onClick={() => void deleteSubmission(submission.id)}
                          disabled={savingKey === `delete:${submission.id}`}
                          className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-left text-xs font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {showTopButton ? (
        <button
          type="button"
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
  );
}
