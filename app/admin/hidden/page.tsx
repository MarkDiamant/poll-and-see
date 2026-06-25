"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Row = {
  id: number;
  question: string;
  description: string | null;
  category: string | null;
  options: string[] | null;
  created_at: string | null;
  slug: string | null;
  embed_token: string | null;
};

const ADMIN_KEY_STORAGE = "pollandsee-admin-key";
const SITE_URL = "https://www.pollandsee.com";

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

function buildPollUrl(slug: string | null) {
  return slug ? `${SITE_URL}/poll/${slug}` : "";
}

function buildIframeCode(embedToken: string | null, embedStyle: "dark" | "light" = "dark") {
  if (!embedToken) return "";

  const src =
    embedStyle === "light"
      ? `${SITE_URL}/embed/${embedToken}?theme=light`
      : `${SITE_URL}/embed/${embedToken}`;

  return `<iframe src="${src}" width="100%" height="100%" style="border:0; display:block; overflow:hidden; background:transparent;" loading="lazy" scrolling="no"></iframe>`;
}

function buildPollShareText(question: string, pollUrl: string) {
  return `${question}\n\nVote and see what others think:\n\n${pollUrl}`;
}

export default function HiddenPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState("");

  const [questionEdits, setQuestionEdits] = useState<Record<number, string>>({});
  const [descriptionEdits, setDescriptionEdits] = useState<Record<number, string>>({});
  const [optionsEdits, setOptionsEdits] = useState<Record<number, string>>({});

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/admin/hidden", {
        headers: {
          "x-admin-key": localStorage.getItem(ADMIN_KEY_STORAGE) || "",
        },
      });

      const data = await res.json();
      const rows = data.items || [];

      setItems(rows);
      setQuestionEdits(Object.fromEntries(rows.map((r: Row) => [r.id, r.question])));
      setDescriptionEdits(Object.fromEntries(rows.map((r: Row) => [r.id, r.description || ""])));
      setOptionsEdits(Object.fromEntries(rows.map((r: Row) => [r.id, (r.options || []).join("\n")])));
      setLoading(false);
    };

    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;

    return items.filter((item) =>
      [item.question, item.description || "", item.category || "", ...(item.options || [])]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [items, search]);

  const save = async (id: number) => {
    setSaving(id);

    await fetch(`/api/admin/poll-submissions/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": localStorage.getItem(ADMIN_KEY_STORAGE) || "",
      },
      body: JSON.stringify({
        question: questionEdits[id],
        description: descriptionEdits[id],
        options: (optionsEdits[id] || "")
          .split("\n")
          .map((option) => option.trim())
          .filter(Boolean),
      }),
    });

    setSaving(null);
  };

  const makePublic = async (id: number) => {
    setSaving(id);

    await fetch(`/api/admin/poll-submissions/${id}/approve`, {
      method: "POST",
      headers: {
        "x-admin-key": localStorage.getItem(ADMIN_KEY_STORAGE) || "",
      },
    });

    setItems((current) => current.filter((item) => item.id !== id));
    setSaving(null);
  };

  const handleCopy = async (key: string, value: string) => {
    if (!value) return;

    await navigator.clipboard.writeText(value);
    setCopiedKey(key);

    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? "" : current));
    }, 1400);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 px-6 py-8 text-white">
      <section className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Hidden polls</h1>
            <p className="mt-1 text-sm text-gray-300">
              Polls hidden from the homepage and submissions queue.
            </p>
          </div>

          <nav className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href="/admin/polls" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
              Live Polls
            </Link>

            <Link href="/admin/submissions" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
              Submissions
            </Link>

<Link href="/admin/hidden" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">
  <span>Hidden</span>
  {badge(items.length, true)}
</Link>

<Link href="/admin/sponsors" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
  Advertisers
</Link>

<Link href="/admin/advertiser-enquiries" className="inline-flex shrink-0 shrink-0 items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
  Enquiries
</Link>
          </nav>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search hidden polls..."
          className="mb-4 h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500"
        />

        <div className="overflow-x-auto rounded-2xl border border-gray-700 bg-gray-800 shadow-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-900/95 text-left text-gray-300">
              <tr>
                <th className="px-4 py-3 font-medium">Poll</th>
                <th className="px-4 py-3 font-medium">Options</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-300">
                    Loading hidden polls...
                  </td>
                </tr>
              ) : null}

              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-300">
                    No hidden polls found.
                  </td>
                </tr>
              ) : null}

              {!loading &&
                filtered.map((item, index) => {
                  const pollUrl = buildPollUrl(item.slug);

                  return (
                    <tr
                      key={item.id}
                      className={`border-t border-gray-700 align-top ${
                        index % 2 === 0 ? "bg-gray-800" : "bg-black/40"
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="min-w-[380px] max-w-[520px] space-y-2">
                          <input
                            value={questionEdits[item.id] ?? ""}
                               onChange={(event) =>
                              setQuestionEdits((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            onBlur={() => void save(item.id)}
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-medium text-white outline-none transition focus:border-gray-500"
                          />

                          <textarea
                            value={descriptionEdits[item.id] ?? ""}
                            onChange={(event) =>
                              setDescriptionEdits((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            onBlur={() => void save(item.id)}
                            rows={2}
                            className="w-full resize-none overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition focus:border-gray-500"
                          />
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-[240px] max-w-[320px]">
                          <textarea
                            value={optionsEdits[item.id] ?? ""}
                            onChange={(event) =>
                              setOptionsEdits((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            onBlur={() => void save(item.id)}
                            rows={4}
                            className="w-full resize-none overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white outline-none transition focus:border-gray-500"
                          />
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="min-w-[170px] space-y-2 text-xs text-gray-400">
                          <p>Submission ID {item.id}</p>
                          <p>{item.category || "General"}</p>
                          <p>{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</p>
                          {item.slug ? <p>/poll/{item.slug}</p> : null}
                          {saving === item.id ? <p className="text-yellow-300">Saving...</p> : null}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex min-w-[120px] flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(
                                `share:${item.id}`,
                                buildPollShareText(questionEdits[item.id] || item.question, pollUrl)
                              )
                            }
                            disabled={!pollUrl}
                            className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-left text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-default disabled:opacity-40"
                          >
                            {copiedKey === `share:${item.id}` ? "Copied share text" : "Copy poll share text"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(
                                `iframe-dark:${item.id}`,
                                buildIframeCode(item.embed_token, "dark")
                              )
                            }
                            disabled={!item.embed_token}
                            className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-left text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-default disabled:opacity-40"
                          >
                            {copiedKey === `iframe-dark:${item.id}` ? "Copied dark iframe" : "Copy dark iframe"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(
                                `iframe-light:${item.id}`,
                                buildIframeCode(item.embed_token, "light")
                              )
                            }
                            disabled={!item.embed_token}
                            className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-left text-xs font-medium text-white transition hover:bg-gray-800 disabled:cursor-default disabled:opacity-40"
                          >
                            {copiedKey === `iframe-light:${item.id}` ? "Copied light iframe" : "Copy light iframe"}
                          </button>

                          <a
                            href={pollUrl || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className={`rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-left text-xs font-medium text-white transition hover:bg-gray-800 ${
                              !pollUrl ? "pointer-events-none opacity-40" : ""
                            }`}
                          >
                            Open poll
                          </a>

                          <button
                            type="button"
                            onClick={() => void makePublic(item.id)}
                            disabled={saving === item.id}
                            className="cursor-pointer rounded-lg bg-white px-2.5 py-1.5 text-left text-xs font-medium text-black transition hover:bg-gray-200 disabled:cursor-default disabled:opacity-40"
                          >
                            Make Public
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