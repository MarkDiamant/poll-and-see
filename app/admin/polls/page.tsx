"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  created_at: string | null;
};

type EmbedStatus = "live" | "closed" | "inactive";

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

function buildEmbedUrl(embedToken: string | null) {
  return embedToken ? `${SITE_URL}/embed/${embedToken}` : "";
}

function estimateEmbedHeight(poll: PollRow) {
  const questionLength = (poll.question || "").trim().length;
  const descriptionLength = (poll.description || "").trim().length;

  let height = 250;

  if (questionLength > 70) height += 20;
  if (questionLength > 120) height += 20;
  if (questionLength > 180) height += 20;

  if (descriptionLength > 0) height += 30;
  if (descriptionLength > 120) height += 20;

  return Math.max(280, Math.min(460, height));
}

function buildIframeCode(embedToken: string | null, poll?: PollRow) {
  if (!embedToken) return "";

  const height = poll ? estimateEmbedHeight(poll) : 380;

  return `<iframe src="${SITE_URL}/embed/${embedToken}" width="100%" height="${height}" style="border:0; overflow:hidden; background:transparent; display:block;" loading="lazy" scrolling="no"></iframe>`;
}

function isValidSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function getSlugError(
  slug: string,
  currentId: number,
  slugRecords: Array<{ id: number; slug: string }>
) {
  const trimmed = slug.trim();

  if (!trimmed) return "Slug cannot be empty.";
  if (!isValidSlug(trimmed)) {
    return "Use lowercase letters, numbers and hyphens only.";
  }

  const duplicate = slugRecords.some(
    (record) => record.id !== currentId && record.slug === trimmed
  );

  if (duplicate) return "Slug already in use.";

  return "";
}

export default function AdminPollsPage() {
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [allSlugRecords, setAllSlugRecords] = useState<Array<{ id: number; slug: string }>>([]);
  const [questionEdits, setQuestionEdits] = useState<Record<number, string>>({});
  const [descriptionEdits, setDescriptionEdits] = useState<Record<number, string>>({});
  const [slugEdits, setSlugEdits] = useState<Record<number, string>>({});
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
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (!adminKey) return;

    const loadPolls = async () => {
      setLoading(true);
      setError("");

      try {
        const url = new URL("/api/admin/polls", window.location.origin);
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
          throw new Error(data.error || "Could not load polls.");
        }

        const nextPolls = data.polls || [];
        setPolls(nextPolls);
        setAllSlugRecords(data.allSlugs || []);

        setQuestionEdits(
          Object.fromEntries(nextPolls.map((poll: PollRow) => [poll.id, poll.question || ""]))
        );
        setDescriptionEdits(
          Object.fromEntries(nextPolls.map((poll: PollRow) => [poll.id, poll.description || ""]))
        );
        setSlugEdits(
          Object.fromEntries(nextPolls.map((poll: PollRow) => [poll.id, poll.slug || ""]))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load polls.");
        setPolls([]);
      } finally {
        setLoading(false);
      }
    };

    void loadPolls();
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
    setPolls([]);
    setAllSlugRecords([]);
    setQuestionEdits({});
    setDescriptionEdits({});
    setSlugEdits({});
    setError("");
  };

  const updatePoll = async (pollId: number, updates: Record<string, unknown>) => {
    setSavingKey(`${pollId}:${Object.keys(updates).join(",")}`);
    setError("");

    try {
      const response = await fetch(`/api/admin/polls/${pollId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify(updates),
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

      if (typeof data.poll?.slug === "string") {
        setSlugEdits((current) => ({ ...current, [pollId]: data.poll.slug }));
        setAllSlugRecords((current) => {
          const withoutCurrent = current.filter((record) => record.id !== pollId);
          return [...withoutCurrent, { id: pollId, slug: data.poll.slug }].sort((a, b) =>
            a.slug.localeCompare(b.slug)
          );
        });
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

  const sortedPolls = useMemo(() => {
    return [...polls].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [polls]);

  if (!adminKey) {
    return (
     <main className="m-0 w-full overflow-hidden bg-transparent p-0 text-white">
        <section className="mx-auto max-w-xl rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <h1 className="mb-2 text-2xl font-semibold">Poll Admin</h1>
          <p className="mb-5 text-sm text-gray-300">Enter your admin key to manage polls.</p>

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
            <h1 className="text-3xl font-semibold">Admin Polls</h1>
            <p className="mt-1 text-sm text-gray-300">
              Manage live polls without using Supabase directly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex items-center gap-2">
              <Link
                href="/admin/polls"
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
              >
                Polls
              </Link>
              <Link
                href="/admin/submissions"
                className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Submissions
              </Link>
            </nav>

            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search question or slug..."
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
                <th className="px-4 py-3 font-medium">Private</th>
                <th className="px-4 py-3 font-medium">Featured</th>
                <th className="px-4 py-3 font-medium">Embed</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-300">
                    Loading polls...
                  </td>
                </tr>
              ) : null}

              {!loading && sortedPolls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-300">
                    No polls found.
                  </td>
                </tr>
              ) : null}

              {!loading &&
                sortedPolls.map((poll, index) => {
                  const pollUrl = buildPollUrl(poll.slug);
                  const embedUrl = buildEmbedUrl(poll.embed_token);
                  const iframeCode = buildIframeCode(poll.embed_token, poll);
                  const embedStatus = getEmbedStatus(poll);
                  const slugError = getSlugError(slugEdits[poll.id] || "", poll.id, allSlugRecords);

                  return (
                    <tr
                      key={poll.id}
                      className={`border-t border-gray-700 align-top ${
                        index % 2 === 0 ? "bg-gray-800" : "bg-gray-900/35"
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="min-w-[300px] max-w-[340px] space-y-2">
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
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-gray-400">
                              ID {poll.id}
                              {poll.created_at
                                ? ` • ${new Date(poll.created_at).toLocaleString()}`
                                : ""}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                void updatePoll(poll.id, {
                                  question: (questionEdits[poll.id] || "").trim(),
                                  description: (descriptionEdits[poll.id] || "").trim(),
                                })
                              }
                              disabled={savingKey === `${poll.id}:question,description`}
                              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
                            >
                              Save content
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-[220px] max-w-[240px] space-y-2">
                          <input
                            type="text"
                            value={slugEdits[poll.id] ?? ""}
                            onChange={(event) =>
                              setSlugEdits((current) => ({
                                ...current,
                                [poll.id]: event.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500"
                          />
                          {slugError ? (
                            <p className="text-xs text-amber-300">{slugError}</p>
                          ) : (
                            <p className="text-xs text-green-300">Slug available.</p>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              void updatePoll(poll.id, {
                                slug: (slugEdits[poll.id] || "").trim(),
                              })
                            }
                            disabled={Boolean(slugError) || savingKey === `${poll.id}:slug`}
                            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800 disabled:opacity-40"
                          >
                            Save slug
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void updatePoll(poll.id, { is_private: !poll.is_private })}
                          disabled={savingKey === `${poll.id}:is_private`}
                          className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:opacity-60 ${
                            poll.is_private
                              ? "bg-white text-black hover:bg-gray-200"
                              : "border border-gray-700 bg-gray-900 text-white hover:bg-gray-800"
                          }`}
                        >
                          {poll.is_private ? "Private" : "Public"}
                        </button>
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void updatePoll(poll.id, { featured: !poll.featured })}
                          disabled={savingKey === `${poll.id}:featured`}
                          className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:opacity-60 ${
                            poll.featured
                              ? "bg-white text-black hover:bg-gray-200"
                              : "border border-gray-700 bg-gray-900 text-white hover:bg-gray-800"
                          }`}
                        >
                          {poll.featured ? "Featured" : "Not featured"}
                        </button>
                      </td>

                      <td className="px-4 py-4">
                        <select
                          value={embedStatus}
                          onChange={(event) =>
                            void updatePoll(poll.id, getEmbedPayload(event.target.value as EmbedStatus))
                          }
                          className="min-w-[110px] rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500"
                        >
                          <option value="live">Live</option>
                          <option value="closed">Closed</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex min-w-[150px] flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => void handleCopy(`poll:${poll.id}`, pollUrl)}
                            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-left text-xs font-medium text-white transition hover:bg-gray-800"
                          >
                            {copiedKey === `poll:${poll.id}` ? "Copied poll URL" : "Copy poll URL"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleCopy(`embed:${poll.id}`, embedUrl)}
                            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-left text-xs font-medium text-white transition hover:bg-gray-800"
                          >
                            {copiedKey === `embed:${poll.id}` ? "Copied embed URL" : "Copy embed URL"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleCopy(`iframe:${poll.id}`, iframeCode)}
                            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-left text-xs font-medium text-white transition hover:bg-gray-800"
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

                          <a
                            href={embedUrl || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className={`rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-left text-xs font-medium text-white transition hover:bg-gray-800 ${
                              !embedUrl ? "pointer-events-none opacity-40" : ""
                            }`}
                          >
                            Open embed
                          </a>
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