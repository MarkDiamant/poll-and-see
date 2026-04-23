"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PollOptionRow = {
  id: number;
  poll_id: number;
  option_text: string;
  image_url: string | null;
  vote_count: number;
};

type PollRow = {
  id: number;
  question: string;
  description: string | null;
  slug: string | null;
  category: string | null;
  is_private: boolean | null;
  featured: boolean | null;
  embed_token: string | null;
  is_embeddable: boolean;
  embed_active: boolean;
  embed_voting_enabled: boolean;
  is_publicly_listed?: boolean | null;
  created_at: string | null;
  options: PollOptionRow[];
};

type CategoryOption =
  | "General"
  | "Lifestyle"
  | "Community"
  | "Finance"
  | "Business"
  | "Education"
  | "Fun";

type EmbedStatus = "live" | "closed" | "inactive";

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
const SITE_URL = "https://www.pollandsee.com";

function getEmbedStatus(poll: PollRow): EmbedStatus {
  if (!poll.is_embeddable || !poll.embed_active) return "inactive";
  if (!poll.embed_voting_enabled) return "closed";
  return "live";
}

function getEmbedPayload(status: EmbedStatus) {
  if (status === "live") {
    return {
      is_embeddable: true,
      embed_active: true,
      embed_voting_enabled: true,
    };
  }

  if (status === "closed") {
    return {
      is_embeddable: true,
      embed_active: true,
      embed_voting_enabled: false,
    };
  }

  return {
    is_embeddable: false,
    embed_active: false,
    embed_voting_enabled: false,
  };
}

function buildPollUrl(slug: string | null) {
  return slug ? `${SITE_URL}/poll/${slug}` : "";
}

function buildIframeCode(embedToken: string | null) {
  if (!embedToken) return "";
  return `<iframe src="${SITE_URL}/embed/${embedToken}" width="100%" height="100%" style="border:0; display:block; overflow:hidden; background:transparent;" loading="lazy" scrolling="no"></iframe>`;
}

function buildPollShareText(question: string, pollUrl: string) {
  return `${question}\n\nVote and see what others think:\n\n${pollUrl}`;
}

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

export default function AdminPollsPage() {
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [adminKey, setAdminKey] = useState("");
const [searchInput, setSearchInput] = useState("");
const [privacyFilter, setPrivacyFilter] = useState<"all" | "public" | "private">("all");
const [categoryFilter, setCategoryFilter] = useState<"all" | CategoryOption>("all");
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState(0);

  const [questionEdits, setQuestionEdits] = useState<Record<number, string>>({});
  const [descriptionEdits, setDescriptionEdits] = useState<Record<number, string>>({});
  const [categoryEdits, setCategoryEdits] = useState<Record<number, CategoryOption>>({});
  const [privacyEdits, setPrivacyEdits] = useState<Record<number, boolean>>({});
  const [featuredEdits, setFeaturedEdits] = useState<Record<number, boolean>>({});
  const [embedStatusEdits, setEmbedStatusEdits] = useState<Record<number, EmbedStatus>>({});
  const [optionEdits, setOptionEdits] = useState<Record<number, PollOptionRow[]>>({});

  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_KEY_STORAGE) || "";
    if (saved) {
      setAdminKey(saved);
      setAdminKeyInput(saved);
    }
  }, []);

  useEffect(() => {
    if (!adminKey) return;

    const loadPolls = async () => {
      setLoading(true);
      setError("");

      try {
        const url = new URL("/api/admin/polls", window.location.origin);
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
          throw new Error(data.error || "Could not load polls.");
        }

        const nextPolls = data.polls || [];
        setPolls(nextPolls);
        setPendingSubmissionsCount(data.pendingSubmissionsCount || 0);

        setQuestionEdits(
          Object.fromEntries(nextPolls.map((poll: PollRow) => [poll.id, poll.question || ""]))
        );
        setDescriptionEdits(
          Object.fromEntries(nextPolls.map((poll: PollRow) => [poll.id, poll.description || ""]))
        );
        setCategoryEdits(
          Object.fromEntries(
            nextPolls.map((poll: PollRow) => [poll.id, (poll.category as CategoryOption) || "General"])
          )
        );
        setPrivacyEdits(
          Object.fromEntries(nextPolls.map((poll: PollRow) => [poll.id, Boolean(poll.is_private)]))
        );
        setFeaturedEdits(
          Object.fromEntries(nextPolls.map((poll: PollRow) => [poll.id, Boolean(poll.featured)]))
        );
        setEmbedStatusEdits(
          Object.fromEntries(nextPolls.map((poll: PollRow) => [poll.id, getEmbedStatus(poll)]))
        );
        setOptionEdits(
          Object.fromEntries(nextPolls.map((poll: PollRow) => [poll.id, poll.options || []]))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load polls.");
        setPolls([]);
      } finally {
        setLoading(false);
      }
    };

    void loadPolls();
}, [adminKey, searchInput]);

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
    setPolls([]);
    setPendingSubmissionsCount(0);
    setQuestionEdits({});
    setDescriptionEdits({});
    setCategoryEdits({});
    setPrivacyEdits({});
    setFeaturedEdits({});
    setEmbedStatusEdits({});
    setOptionEdits({});
    setError("");
  };

  const updatePoll = async (pollId: number) => {
    setSavingKey(`save:${pollId}`);
    setError("");

    try {
      const response = await fetch(`/api/admin/polls/${pollId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          question: (questionEdits[pollId] || "").trim(),
          description: (descriptionEdits[pollId] || "").trim(),
          category: categoryEdits[pollId] || "General",
          is_private: Boolean(privacyEdits[pollId]),
          featured: Boolean(featuredEdits[pollId]),
          ...getEmbedPayload(embedStatusEdits[pollId] || "inactive"),
          option_updates: (optionEdits[pollId] || []).map((option) => ({
            id: option.id || null,
            option_text: option.option_text,
            image_url: option.image_url || null,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not update poll.");
      }

      setPolls((current) => {
        let next = current.map((poll) =>
          poll.id === pollId ? { ...poll, ...data.poll } : poll
        );

        if (data.poll?.featured) {
          next = next.map((poll) =>
            poll.id === pollId ? poll : { ...poll, featured: false }
          );
        }

        return next;
      });

      if (typeof data.poll?.question === "string") {
        setQuestionEdits((current) => ({ ...current, [pollId]: data.poll.question }));
      }

      if (typeof data.poll?.description === "string" || data.poll?.description === null) {
        setDescriptionEdits((current) => ({
          ...current,
          [pollId]: data.poll.description || "",
        }));
      }

      if (typeof data.poll?.category === "string") {
        setCategoryEdits((current) => ({
          ...current,
          [pollId]: data.poll.category as CategoryOption,
        }));
      }

      if (typeof data.poll?.is_private === "boolean") {
        setPrivacyEdits((current) => ({ ...current, [pollId]: data.poll.is_private }));
      }

      if (typeof data.poll?.featured === "boolean") {
        setFeaturedEdits((current) => {
          const next = { ...current };
          Object.keys(next).forEach((key) => {
            next[Number(key)] = false;
          });
          next[pollId] = data.poll.featured;
          return next;
        });
      }

      if (Array.isArray(data.poll?.options)) {
        setOptionEdits((current) => ({ ...current, [pollId]: data.poll.options }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update poll.");
    } finally {
      setSavingKey("");
    }
  };

  const handleCopy = async (key: string, value: string) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? "" : current));
      }, 1400);
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  const addOptionRow = (pollId: number) => {
    setOptionEdits((current) => ({
      ...current,
      [pollId]: [
        ...(current[pollId] || []),
        {
          id: 0,
          poll_id: pollId,
          option_text: "",
          image_url: "",
          vote_count: 0,
        },
      ],
    }));
  };

  const updateOptionText = (pollId: number, optionIndex: number, value: string) => {
    setOptionEdits((current) => {
      const next = [...(current[pollId] || [])];
      next[optionIndex] = { ...next[optionIndex], option_text: value };
      return { ...current, [pollId]: next };
    });
  };

  const updateOptionImageUrl = (pollId: number, optionIndex: number, value: string) => {
    setOptionEdits((current) => {
      const next = [...(current[pollId] || [])];
      next[optionIndex] = { ...next[optionIndex], image_url: value };
      return { ...current, [pollId]: next };
    });
  };

const sortedPolls = useMemo(() => {
  return [...polls]
    .filter((poll) => {
      if (privacyFilter === "public" && poll.is_private) return false;
      if (privacyFilter === "private" && !poll.is_private) return false;
      if (categoryFilter !== "all" && poll.category !== categoryFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
}, [polls, privacyFilter, categoryFilter]);

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
      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
    >
      <span>Live Polls</span>
    {sortedPolls.length > 0 ? badge(sortedPolls.length, true) : null}
    </Link>
    <Link
      href="/admin/submissions"
      className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
    >
      <span>Submissions</span>
      {pendingSubmissionsCount > 0 ? badge(pendingSubmissionsCount, false) : null}
    </Link>
  </nav>

  <input
    type="text"
    value={searchInput}
    onChange={(event) => setSearchInput(event.target.value)}
    placeholder="Search live polls..."
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

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-gray-700 bg-gray-800 shadow-lg">
  <table className="min-w-[1180px] text-sm">
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
                    Loading polls...
                  </td>
                </tr>
              ) : null}

              {!loading && sortedPolls.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-300">
                    No polls found.
                  </td>
                </tr>
              ) : null}

              {!loading &&
                sortedPolls.map((poll, index) => {
                  const pollUrl = buildPollUrl(poll.slug);
                  const iframeCode = buildIframeCode(poll.embed_token);

                  return (
                    <tr
                      key={poll.id}
                      className={`border-t border-gray-700 align-top ${
                      index % 2 === 0 ? "bg-gray-800" : "bg-black/40"
                      }`}
                    >
                      <td className="px-4 py-4">
                      <div className="min-w-[380px] max-w-[460px] space-y-2">
                          <input
                            type="text"
                            value={questionEdits[poll.id] ?? ""}
                            onChange={(event) =>
                              setQuestionEdits((current) => ({
                                ...current,
                                [poll.id]: event.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500"
                          />
                          <textarea
                            value={descriptionEdits[poll.id] ?? ""}
                            onChange={(event) =>
                              setDescriptionEdits((current) => ({
                                ...current,
                                [poll.id]: event.target.value,
                              }))
                            }
                            rows={3}
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500"
                          />
                          <p className="text-xs text-gray-400">
                            Poll ID {poll.id}
                            {poll.created_at
                              ? ` • ${new Date(poll.created_at).toLocaleString()}`
                              : ""}
                            {poll.slug ? ` • /poll/${poll.slug}` : ""}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                      <div className="min-w-[220px] max-w-[280px] space-y-2">
 {(optionEdits[poll.id] || []).map((option, optionIndex) => (
  <div
    key={`${poll.id}-${option.id || `new-${optionIndex}`}`}
    className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-lg border border-gray-700 bg-gray-900 p-2"
  >
    <input
      type="text"
      value={option.option_text}
      onChange={(event) =>
        updateOptionText(poll.id, optionIndex, event.target.value)
      }
      className="rounded-lg border border-gray-700 bg-black/20 px-3 py-2 text-xs text-white outline-none transition focus:border-gray-500"
      placeholder="Option text"
    />

    <input
      type="text"
      value={option.image_url || ""}
      onChange={(event) =>
        updateOptionImageUrl(poll.id, optionIndex, event.target.value)
      }
      className="rounded-lg border border-gray-700 bg-black/20 px-3 py-2 text-xs text-white outline-none transition focus:border-gray-500"
      placeholder="Image URL (optional)"
    />

    <div className="flex flex-col items-end justify-center gap-1 text-[11px] text-gray-400">
      <span>{option.vote_count} votes</span>
      <button
        type="button"
        onClick={() => {
          const next = [...(optionEdits[poll.id] || [])];
          next.splice(optionIndex, 1);
          setOptionEdits((current) => ({ ...current, [poll.id]: next }));
        }}
        className="text-[10px] text-red-400 hover:text-red-300"
      >
        Remove
      </button>
    </div>
  </div>
))}

                          <button
                            type="button"
                            onClick={() => addOptionRow(poll.id)}
                         className="rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-left text-xs font-medium text-white transition hover:bg-gray-800"
                          >
                            Add option
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-4">
            <div className="min-w-[150px] grid grid-cols-2 gap-2 text-xs text-gray-300">
                          <div className="space-y-1">
                            <span className="text-gray-400">Category</span>
                            <select
                              value={categoryEdits[poll.id] || "General"}
                              onChange={(event) =>
                                setCategoryEdits((current) => ({
                                  ...current,
                                  [poll.id]: event.target.value as CategoryOption,
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
                                  [poll.id]: !current[poll.id],
                                }))
                              }
                              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                                privacyEdits[poll.id]
                                  ? "bg-white text-black hover:bg-gray-200"
                                  : "border border-gray-700 bg-gray-900 text-white hover:bg-gray-800"
                              }`}
                            >
                              {privacyEdits[poll.id] ? "Private" : "Public"}
                            </button>
                          </div>

                          <div className="space-y-1">
                            <span className="text-gray-400">Featured</span>
                            <button
                              type="button"
                              onClick={() =>
                                setFeaturedEdits((current) => ({
                                  ...current,
                                  [poll.id]: !current[poll.id],
                                }))
                              }
                              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                                featuredEdits[poll.id]
                                  ? "bg-white text-black hover:bg-gray-200"
                                  : "border border-gray-700 bg-gray-900 text-white hover:bg-gray-800"
                              }`}
                            >
                              {featuredEdits[poll.id] ? "Featured" : "Not featured"}
                            </button>
                          </div>

                          <div className="space-y-1">
                            <span className="text-gray-400">Embed</span>
                            <select
                              value={embedStatusEdits[poll.id] || "inactive"}
                              onChange={(event) =>
                                setEmbedStatusEdits((current) => ({
                                  ...current,
                                  [poll.id]: event.target.value as EmbedStatus,
                                }))
                              }
                              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white outline-none"
                            >
                              <option value="live">Live</option>
                              <option value="closed">Closed</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                   <div className="flex min-w-[90px] flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(
                                `share:${poll.id}`,
                                buildPollShareText(questionEdits[poll.id] || poll.question, pollUrl)
                              )
                            }
                        className="rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-left text-xs font-medium text-white transition hover:bg-gray-800"
                          >
                            {copiedKey === `share:${poll.id}` ? "Copied share text" : "Copy poll share text"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleCopy(`iframe:${poll.id}`, iframeCode)}
                         className="rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-left text-xs font-medium text-white transition hover:bg-gray-800"
                          >
                            {copiedKey === `iframe:${poll.id}` ? "Copied iframe" : "Copy iframe"}
                          </button>

                          <a
                            href={pollUrl || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className={`rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-left text-xs font-medium text-white transition hover:bg-gray-800 ${
                              !pollUrl ? "pointer-events-none opacity-40" : ""
                            }`}
                          >
                            Open poll
                          </a>

                          <button
                            type="button"
                            onClick={() => void updatePoll(poll.id)}
                            disabled={savingKey === `save:${poll.id}`}
        className="rounded-lg bg-white px-2.5 py-1.5 text-left text-xs font-medium text-black transition hover:bg-gray-200 disabled:opacity-40"
                          >
                            Save row
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