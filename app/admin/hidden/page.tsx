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
};

const ADMIN_KEY_STORAGE = "pollandsee-admin-key";

export default function HiddenPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  const [questionEdits, setQuestionEdits] = useState<Record<number, string>>({});
  const [descriptionEdits, setDescriptionEdits] = useState<Record<number, string>>({});
  const [optionsEdits, setOptionsEdits] = useState<Record<number, string>>({});

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/admin/hidden", {
        headers: {
          "x-admin-key": sessionStorage.getItem(ADMIN_KEY_STORAGE) || "",
        },
      });

      const data = await res.json();
      const rows = data.items || [];

      setItems(rows);

      setQuestionEdits(Object.fromEntries(rows.map((r: Row) => [r.id, r.question])));
      setDescriptionEdits(Object.fromEntries(rows.map((r: Row) => [r.id, r.description || ""])));
      setOptionsEdits(
        Object.fromEntries(
          rows.map((r: Row) => [r.id, (r.options || []).join("\n")])
        )
      );

      setLoading(false);
    };

    void load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((i) =>
      i.question.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const save = async (id: number) => {
    setSaving(id);

    await fetch(`/api/admin/poll-submissions/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": sessionStorage.getItem(ADMIN_KEY_STORAGE) || "",
      },
      body: JSON.stringify({
        question: questionEdits[id],
        description: descriptionEdits[id],
        options: (optionsEdits[id] || "")
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean),
      }),
    });

    setSaving(null);
  };

  const makePublic = async (id: number) => {
    await fetch(`/api/admin/poll-submissions/${id}/approve`, {
      method: "POST",
      headers: {
        "x-admin-key": sessionStorage.getItem(ADMIN_KEY_STORAGE) || "",
      },
    });

    setItems((current) => current.filter((i) => i.id !== id));
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 px-6 py-8 text-white">
      <section className="mx-auto max-w-[1200px]">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Hidden polls</h1>

          <nav className="flex gap-2">
            <Link href="/admin/polls" className="px-4 py-2 border rounded-xl">Live</Link>
            <Link href="/admin/submissions" className="px-4 py-2 border rounded-xl">Submissions</Link>
           <Link href="/admin/hidden" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-black">
  <span>Hidden</span>
  <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-black/10 px-1.5 py-0.5 text-[11px] font-semibold text-black">
    {items.length}
  </span>
</Link>
          </nav>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search hidden polls..."
          className="mb-4 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm"
        />

        <div className="space-y-4">
          {loading && <p>Loading...</p>}

          {!loading &&
            filtered.map((item) => (
              <div key={item.id} className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
                <input
                  value={questionEdits[item.id]}
                  onChange={(e) =>
                    setQuestionEdits((c) => ({ ...c, [item.id]: e.target.value }))
                  }
                  onBlur={() => save(item.id)}
                  className="w-full mb-2 bg-gray-900 p-2 rounded"
                />

                <textarea
                  value={descriptionEdits[item.id]}
                  onChange={(e) =>
                    setDescriptionEdits((c) => ({ ...c, [item.id]: e.target.value }))
                  }
                  onBlur={() => save(item.id)}
                  className="w-full mb-2 bg-gray-900 p-2 rounded"
                />

                <textarea
                  value={optionsEdits[item.id]}
                  onChange={(e) =>
                    setOptionsEdits((c) => ({ ...c, [item.id]: e.target.value }))
                  }
                  onBlur={() => save(item.id)}
                  className="w-full mb-3 bg-gray-900 p-2 rounded"
                />

                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">
                    {item.created_at &&
                      new Date(item.created_at).toLocaleString()}
                  </span>

                  <button
                    onClick={() => makePublic(item.id)}
                    className="bg-white text-black px-4 py-2 rounded"
                  >
                    Make Public
                  </button>
                </div>
              </div>
            ))}
        </div>
      </section>
    </main>
  );
}