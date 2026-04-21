"use client";

import { useEffect, useMemo, useState } from "react";

type PollRow = {
  id: number;
  question: string;
  slug: string | null;
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

function buildIframeCode(embedToken: string | null) {
  if (!embedToken) return "";
  return `<iframe src="${SITE_URL}/embed/${embedToken}" width="100%" height="720" style="border:0; overflow:hidden;" loading="lazy" allowfullscreen></iframe>`;
}

export default function AdminPollsPage() {
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [slugEdits, setSlugEdits] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string>("");
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

        setPolls(data.polls || []);
        setSlugEdits(
          Object.fromEntries(
            (data.polls || []).map((poll: PollRow) => [poll.id, poll.slug || ""])
          )
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

      setPolls((current) =>
        current.map((poll) => (poll.id === pollId ? { ...poll, ...data.poll } : poll))
      );

      if (typeof data.poll?.slug === "string") {
        setSlugEdits((current) => ({
          ...current,
          [pollId]: data.poll.slug,
        }));
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
      <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 px-6 py-10 text-white">
        <section className="mx-auto max-w-xl rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <h1 className="mb-2 text-2xl font-semibold">Poll Admin</h1>
          <p className="mb-5 text-sm text-gray-300">
            Enter your admin key to manage polls.
          </p>

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
              Manage routine poll actions without using Supabase directly.
            </p>
          </div>

          <div className="flex items-center gap-3">
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

        <div className="overflow-x-auto rounded-2xl border border-gray-700 bg-gray-800 shadow-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900/70 text-left text-gray-300">
              <tr>
                <th className="px-4 py-3 font-medium">Question</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Private</th>
                <th className="px-4 py-3 font-medium">Featured</th>
                <th className="px-4 py-3 font-medium">Embed status</th>
                <th className="px-4 py-3 font-medium">Poll URL</th>
                <th className="px-4 py-3 font-medium">Embed URL</th>
                <th className="px-4 py-3 font-medium">Iframe code</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-gray-300">
                    Loading polls...
                  </td>
                </tr>
              ) : null}

              {!loading && sortedPolls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-gray-300">
                    No polls found.
                  </td>
                </tr>
              ) : null}

              {!loading &&
                sortedPolls.map((poll) => {
                  const pollUrl = buildPollUrl(poll.slug);
                  const embedUrl = buildEmbedUrl(poll.embed_token);
                  const iframeCode = buildIframeCode(poll.embed_token);
                  const embedStatus = getEmbedStatus(poll);

                  return (
                    <tr key={poll.id} className="border-t border-gray-700 align-top">
                      <td className="px-4 py-4">
                        <div className="min-w-[260px]">
                          <p className="font-medium text-white">{poll.question}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            ID {poll.id}
                            {poll.created_at
                              ? ` • ${new Date(poll.created_at).toLocaleString()}`
                              : ""}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-[220px] space-y-2">
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
                          <button
                            type="button"
                            onClick={() =>
                              void updatePoll(poll.id, { slug: (slugEdits[poll.id] || "").trim() })
                            }
                            disabled={savingKey === `${poll.id}:slug`}
                            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
                          >
                            Save slug
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            void updatePoll(poll.id, { is_private: !poll.is_private })
                          }
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
                          onClick={() =>
                            void updatePoll(poll.id, { featured: !poll.featured })
                          }
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
                          className="min-w-[120px] rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500"
                        >
                          <option value="live">Live</option>
                          <option value="closed">Closed</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-[280px] space-y-2">
                          <input
                            type="text"
                            readOnly
                            value={pollUrl}
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-300 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => void handleCopy(`poll:${poll.id}`, pollUrl)}
                            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800"
                          >
                            {copiedKey === `poll:${poll.id}` ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-[320px] space-y-2">
                          <input
                            type="text"
                            readOnly
                            value={embedUrl}
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-300 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => void handleCopy(`embed:${poll.id}`, embedUrl)}
                            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800"
                          >
                            {copiedKey === `embed:${poll.id}` ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-[360px] space-y-2">
                          <textarea
                            readOnly
                            value={iframeCode}
                            rows={4}
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-300 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => void handleCopy(`iframe:${poll.id}`, iframeCode)}
                            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-gray-800"
                          >
                            {copiedKey === `iframe:${poll.id}` ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex min-w-[120px] flex-col gap-2">
                          <a
                            href={pollUrl || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className={`rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-center text-xs font-medium text-white transition hover:bg-gray-800 ${
                              !pollUrl ? "pointer-events-none opacity-40" : ""
                            }`}
                          >
                            Open poll
                          </a>

                          <a
                            href={embedUrl || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className={`rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-center text-xs font-medium text-white transition hover:bg-gray-800 ${
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