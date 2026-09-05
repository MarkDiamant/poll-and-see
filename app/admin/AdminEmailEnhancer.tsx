"use client";

import { useEffect } from "react";

const ADMIN_KEY_STORAGE = "pollandsee-admin-key";

type EmailItem = {
  question: string;
  email: string;
};

export default function AdminEmailEnhancer() {
  useEffect(() => {
    if (window.location.pathname !== "/admin/polls" && window.location.pathname !== "/admin/hidden") return;

    let cancelled = false;
    let observer: MutationObserver | null = null;

    const addEmailFields = (items: EmailItem[]) => {
      const byQuestion = new Map(items.filter((x) => x.email).map((x) => [x.question.trim(), x.email]));

      document.querySelectorAll<HTMLInputElement>('input[type="text"], input:not([type])').forEach((input) => {
        const email = byQuestion.get((input.value || "").trim());
        if (!email) return;

        const host = input.parentElement;
        if (!host || host.querySelector('[data-submitter-email="true"]')) return;

        const wrap = document.createElement("div");
        wrap.dataset.submitterEmail = "true";
        wrap.className = "mt-2";

        const label = document.createElement("label");
        label.className = "mb-1 block text-xs font-medium text-gray-400";
        label.textContent = "Email";

        const emailInput = document.createElement("input");
        emailInput.type = "email";
        emailInput.readOnly = true;
        emailInput.value = email;
        emailInput.className = "h-10 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-white outline-none";

        wrap.append(label, emailInput);
        input.insertAdjacentElement("afterend", wrap);
      });
    };

    const load = async () => {
      const adminKey = localStorage.getItem(ADMIN_KEY_STORAGE) || "";
      if (!adminKey) return;

      const response = await fetch("/api/admin/poll-emails", { headers: { "x-admin-key": adminKey } });
      if (!response.ok || cancelled) return;
      const data = await response.json();
      const items: EmailItem[] = data.items || [];
      addEmailFields(items);

      observer = new MutationObserver(() => addEmailFields(items));
      observer.observe(document.body, { childList: true, subtree: true });
    };

    void load();
    return () => { cancelled = true; observer?.disconnect(); };
  }, []);

  return null;
}
