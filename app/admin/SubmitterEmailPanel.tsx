"use client";

import { useEffect, useMemo, useState } from "react";

const ADMIN_KEY_STORAGE = "pollandsee-admin-key";

type Item = {
  poll_id: number;
  question: string;
  email: string;
  status: string;
};

export default function SubmitterEmailPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const adminKey = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
      if (!adminKey) return;

      const response = await fetch("/api/admin/poll-emails", {
        headers: { "x-admin-key": adminKey },
      });
      if (!response.ok) return;
      const data = await response.json();
      setItems(data.items || []);
    };

    void load();
    const interval = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      `${item.poll_id} ${item.question} ${item.email} ${item.status}`.toLowerCase().includes(term)
    );
  }, [items, search]);

  return (
    <div className="fixed bottom-5 left-5 z-[60] max-w-[calc(100vw-2.5rem)] text-sm">
      {open ? (
        <div className="mb-2 w-[440px] max-w-full rounded-2xl border border-gray-700 bg-gray-950 p-3 text-white shadow-2xl">
          <div className="mb-2 flex items-center justify-between gap-3">
            <strong>Submitter emails</strong>
            <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">Close</button>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search poll, email or status..."
            className="mb-2 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white outline-none"
          />
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {filtered.map((item) => (
              <div key={item.poll_id} className="rounded-lg border border-gray-800 bg-gray-900 p-2">
                <div className="text-xs text-gray-400">Poll {item.poll_id} · {item.status}</div>
                <div className="line-clamp-2 text-xs">{item.question}</div>
                <a href={`mailto:${item.email}`} className="mt-1 block break-all text-xs text-cyan-300 hover:underline">
                  {item.email}
                </a>
              </div>
            ))}
            {filtered.length === 0 ? <div className="py-3 text-center text-xs text-gray-400">No saved submitter emails found.</div> : null}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 font-medium text-white shadow-lg hover:bg-gray-800"
      >
        Submitter emails
      </button>
    </div>
  );
}
