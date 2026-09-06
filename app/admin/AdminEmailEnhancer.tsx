"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ADMIN_KEY_STORAGE = "pollandsee-admin-key";

type EmailItem = { poll_id: number; submission_id: number | null; email: string | null; status: string };

function buildEmailBox(email: string | null) {
  const wrap = document.createElement("div");
  wrap.dataset.submitterEmail = "true";
  wrap.className = "space-y-1";
  const label = document.createElement("label");
  label.className = "block text-xs font-medium text-gray-400";
  label.textContent = "Email";
  const input = document.createElement("input");
  input.type = "email";
  input.readOnly = true;
  input.value = email || "";
  input.placeholder = "No email";
  input.className = "h-10 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-white outline-none placeholder:text-gray-500";
  wrap.append(label, input);
  return wrap;
}

function findSettingsGrid(card: Element) {
  return Array.from(card.querySelectorAll("div")).find((node) => {
    const text = node.textContent || "";
    const className = node.getAttribute("class") || "";
    return className.includes("grid-cols-2") && text.includes("Category") && text.includes("Privacy");
  });
}

export default function AdminEmailEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/admin/polls" && pathname !== "/admin/hidden") return;
    let cancelled = false;
    let observer: MutationObserver | null = null;
    let refreshTimer: number | null = null;

    const applyFields = (items: EmailItem[]) => {
      const byPollId = new Map<number, string | null>();
      const bySubmissionId = new Map<number, string | null>();
      for (const item of items) {
        if (!byPollId.has(item.poll_id) || item.email) byPollId.set(item.poll_id, item.email || null);
        if (item.submission_id) bySubmissionId.set(item.submission_id, item.email || null);
      }

      document.querySelectorAll("tr").forEach((row) => {
        if (row.querySelector('[data-submitter-email="true"]')) return;
        const text = row.textContent || "";
        if (pathname === "/admin/polls") {
          const match = text.match(/Poll ID\s+(\d+)/);
          if (!match) return;
          const cells = row.querySelectorAll("td");
          const grid = cells.item(2)?.querySelector("div.grid") || cells.item(2)?.firstElementChild;
          if (!grid) return;
          const box = buildEmailBox(byPollId.get(Number(match[1])) ?? null);
          box.classList.add("col-span-2");
          grid.appendChild(box);
        } else {
          const match = text.match(/Submission ID\s+(\d+)/);
          if (!match) return;
          const details = row.querySelectorAll("td").item(2)?.firstElementChild;
          if (!details) return;
          const box = buildEmailBox(bySubmissionId.get(Number(match[1])) ?? null);
          box.classList.add("mt-2");
          details.appendChild(box);
        }
      });

      if (pathname === "/admin/polls") {
        document.querySelectorAll("p").forEach((node) => {
          const match = (node.textContent || "").match(/Poll ID\s+(\d+)/);
          if (!match) return;
          const card = node.closest("div.rounded-2xl");
          if (!card || card.querySelector('[data-submitter-email="true"]')) return;
          const grid = findSettingsGrid(card);
          if (!grid) return;
          const box = buildEmailBox(byPollId.get(Number(match[1])) ?? null);
          box.classList.add("col-span-2");
          grid.appendChild(box);
        });
      }
    };

    const load = async () => {
      const adminKey = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
      if (!adminKey) return;
      const response = await fetch("/api/admin/poll-emails", { headers: { "x-admin-key": adminKey }, cache: "no-store" });
      if (!response.ok || cancelled) return;
      const data = await response.json();
      applyFields((data.items || []) as EmailItem[]);
      if (!observer) {
        observer = new MutationObserver(() => applyFields((data.items || []) as EmailItem[]));
        observer.observe(document.body, { childList: true, subtree: true });
      }
    };

    void load();
    refreshTimer = window.setInterval(() => void load(), 8000);
    return () => { cancelled = true; observer?.disconnect(); if (refreshTimer) window.clearInterval(refreshTimer); };
  }, [pathname]);

  return null;
}
