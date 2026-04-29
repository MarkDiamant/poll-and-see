"use client";

import { useEffect, useState } from "react";

export default function HiddenPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/hidden", {
      headers: {
        "x-admin-key": sessionStorage.getItem("pollandsee-admin-key") || "",
      },
    })
      .then((res) => res.json())
      .then((data) => setItems(data.items || []));
  }, []);

  const makePublic = async (id: number) => {
    await fetch(`/api/admin/poll-submissions/${id}/approve`, {
      method: "POST",
      headers: {
        "x-admin-key": sessionStorage.getItem("pollandsee-admin-key") || "",
      },
    });

    setItems((current) => current.filter((i) => i.id !== id));
  };

  return (
    <main className="p-6 text-white">
      <h1 className="text-2xl mb-4">Hidden polls</h1>

      {items.map((item) => (
        <div key={item.id} className="mb-3 border p-3 rounded">
          <p>{item.question}</p>

          <button
            onClick={() => makePublic(item.id)}
            className="mt-2 bg-white text-black px-3 py-1 rounded"
          >
            Make Public
          </button>
        </div>
      ))}
    </main>
  );
}