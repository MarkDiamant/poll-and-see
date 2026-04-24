"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

function suggestCategory(question: string): CategoryOption {
  const q = question.toLowerCase().trim();

  if (!q) return "General";

  if (
    q.includes("school") ||
    q.includes("teacher") ||
    q.includes("student") ||
    q.includes("students") ||
    q.includes("homework") ||
    q.includes("university") ||
    q.includes("college") ||
    q.includes("exam") ||
    q.includes("education") ||
    q.includes("classroom") ||
    q.includes("learning") ||
    q.includes("degree") ||
    q.includes("tuition")
  ) {
    return "Education";
  }

  if (
    q.includes("money") ||
    q.includes("salary") ||
    q.includes("cost") ||
    q.includes("price") ||
    q.includes("prices") ||
    q.includes("rent") ||
    q.includes("mortgage") ||
    q.includes("tax") ||
    q.includes("income") ||
    q.includes("finance") ||
    q.includes("financial") ||
    q.includes("bills") ||
    q.includes("saving") ||
    q.includes("savings") ||
    q.includes("afford") ||
    q.includes("affording") ||
    q.includes("expenses") ||
    q.includes("paid") ||
    q.includes("pay rise") ||
    q.includes("wages") ||
    q.includes("debt")
  ) {
    return "Finance";
  }

  if (
    q.includes("business") ||
    q.includes("startup") ||
    q.includes("marketing") ||
    q.includes("customer") ||
    q.includes("customers") ||
    q.includes("sales") ||
    q.includes("office") ||
    q.includes("remote work") ||
    q.includes("hybrid work") ||
    q.includes("workplace") ||
    q.includes("company") ||
    q.includes("career") ||
    q.includes("job market") ||
    q.includes("manager") ||
    q.includes("employee") ||
    q.includes("employees") ||
    q.includes("boss") ||
    q.includes("entrepreneur") ||
    q.includes("freelance")
  ) {
    return "Business";
  }

  if (
    q.includes("community") ||
    q.includes("local") ||
    q.includes("neighbour") ||
    q.includes("neighbor") ||
    q.includes("neighbourhood") ||
    q.includes("neighborhood") ||
    q.includes("communal") ||
    q.includes("public support") ||
    q.includes("charity") ||
    q.includes("volunteer") ||
    q.includes("volunteering") ||
    q.includes("council") ||
    q.includes("area") ||
    q.includes("high street") ||
    q.includes("public services")
  ) {
    return "Community";
  }

  if (
    q.includes("dating") ||
    q.includes("relationship") ||
    q.includes("relationships") ||
    q.includes("marriage") ||
    q.includes("married") ||
    q.includes("parent") ||
    q.includes("parents") ||
    q.includes("parenting") ||
    q.includes("family") ||
    q.includes("kids") ||
    q.includes("children") ||
    q.includes("child") ||
    q.includes("baby") ||
    q.includes("babies") ||
    q.includes("health") ||
    q.includes("healthy") ||
    q.includes("mental health") ||
    q.includes("fitness") ||
    q.includes("exercise") ||
    q.includes("gym") ||
    q.includes("diet") ||
    q.includes("sleep") ||
    q.includes("routine") ||
    q.includes("work life balance") ||
    q.includes("work-life balance") ||
    q.includes("social media") ||
    q.includes("screen time") ||
    q.includes("phone use") ||
    q.includes("phones") ||
    q.includes("lifestyle") ||
    q.includes("home life") ||
    q.includes("stress") ||
    q.includes("wellbeing") ||
    q.includes("well-being")
  ) {
    return "Lifestyle";
  }

  if (
    q.includes("fun") ||
    q.includes("favourite") ||
    q.includes("favorite") ||
    q.includes("movie") ||
    q.includes("film") ||
    q.includes("music") ||
    q.includes("pizza") ||
    q.includes("game") ||
    q.includes("games") ||
    q.includes("holiday") ||
    q.includes("weekend") ||
    q.includes("tv show") ||
    q.includes("series") ||
    q.includes("food") ||
    q.includes("best snack") ||
    q.includes("would you rather")
  ) {
    return "Fun";
  }

  return "General";
}

export default function AdminSubmissionsPage() {
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [privacyFilter, setPrivacyFilter] = useState<"all" | "public" | "private">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | CategoryOption>("all");
  const [submissions, setSubmissions] = useState<PollSubmissionRow[]>([]);
  const [livePollCount, setLivePollCount] = useState(0);
  const [questionEdits, setQuestionEdits] = useState<Record<number, string>>({});
  const [descriptionEdits, setDescriptionEdits] = useState<Record<number, string>>({});
  const [optionsEdits, setOptionsEdits] = useState<Record<number, string>>({});
  const [imageUrlEdits, setImageUrlEdits] = useState<Record<number, string>>({});
  const [emailEdits, setEmailEdits] = useState<Record<number, string>>({});
  const [categoryEdits, setCategoryEdits] = useState<Record<number, CategoryOption>>({});
  const [privacyEdits, setPrivacyEdits] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [showTopButton, setShowTopButton] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<CategoryOption>("General");
  const [newIsPrivate, setNewIsPrivate] = useState(false);
  const [newOptions, setNewOptions] = useState("");
  const [newImageUrls, setNewImageUrls] = useState("");
  const [creatingSubmission, setCreatingSubmission] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_KEY_STORAGE) || "";
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

        if (!showSpinner) return;

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
  if (!savingKey && !creatingSubmission) {
    void loadSubmissions(false);
  }
}, 8000);

return () => {
  isCancelled = true;
  window.clearInterval(refreshInterval);
};
}, [adminKey, searchInput, savingKey, creatingSubmission]);

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
    setLivePollCount(0);
    setQuestionEdits({});
    setDescriptionEdits({});
    setOptionsEdits({});
    setImageUrlEdits({});
    setEmailEdits({});
    setCategoryEdits({});
    setPrivacyEdits({});
    setError("");
  };

  const handleNewQuestionChange = (value: string) => {
    setNewQuestion(value);
    setNewCategory(value.trim() ? suggestCategory(value) : "General");
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
          question: (overrides.question ?? questionEdits[submissionId] || "").trim(),
          description: (overrides.description ?? descriptionEdits[submissionId] || "").trim(),
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

      setNewQuestion("");
      setNewDescription("");
      setNewCategory("General");
      setNewIsPrivate(false);
      setNewOptions("");
      setNewImageUrls("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create submission.");
    } finally {
      setCreatingSubmission(false);
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
        return true;
      })
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });
  }, [submissions, privacyFilter, categoryFilter]);

  if (!adminKey) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 px-6 py-10 text-white">
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
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 px-6 py-8 text-white">
      <section className="mx-auto max-w-[1500px]">
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
            <nav className="flex items-center gap-2">
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
            </nav>

            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search submissions..."
              className="h-11 w-full min-w-[260px] rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500 md:w-[320px]"
            />

            <select
              value={privacyFilter}
              onChange={(event) => setPrivacyFilter(event.target.value as "all" | "public" | "private")}
              className="h-11 rounded-xl border border-gray-700 bg-gray-900 px-3 text-sm text-white outline-none"
            >
              <option value="all">All</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as "all" | CategoryOption)}
              className="h-11 rounded-xl border border-gray-700 bg-gray-900 px-3 text-sm text-white outline-none"
            >
              <option value="all">All categories</option>
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

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
                  rows={2}
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
                  rows={6}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500 resize-none overflow-y-auto"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs text-gray-400">Image URLs (optional)</p>
                  <textarea
                    value={newImageUrls}
                    onChange={(event) => setNewImageUrls(event.target.value)}
                    rows={6}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500 resize-none overflow-y-auto"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void createSubmission()}
                  disabled={creatingSubmission}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-200 disabled:opacity-40"
                >
                  {creatingSubmission ? "Creating..." : "Create submission"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-gray-700 bg-gray-800 shadow-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-900/95 text-left text-gray-300">
              <tr>
                <th className="px-4 py-3 font-medium">Poll</th>
                <th className="px-4 py-3 font-medium">Options / Images</th>
                <th className="px-4 py-3 font-medium">Settings</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-300">
                    Loading submissions...
                  </td>
                </tr>
              ) : null}

              {!loading && sortedSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-300">
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
                          rows={2}
                          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500 resize-none overflow-y-auto"
                        />

                        <p className="text-xs text-gray-400">
                          Submission ID {submission.id}
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
                            onBlur={() => void saveSubmission(submission.id)}
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
                            onChange={(event) =>
                              setCategoryEdits((current) => ({
                                ...current,
                                [submission.id]: event.target.value as CategoryOption,
                              }))
                            }
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
                          className="rounded-lg bg-white px-2 py-1.5 text-left text-xs font-medium text-black transition hover:bg-gray-200 disabled:opacity-40"
                        >
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteSubmission(submission.id)}
                          disabled={savingKey === `delete:${submission.id}`}
                          className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-left text-xs font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
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