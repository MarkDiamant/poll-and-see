"use client";

import { useEffect, type ReactNode } from "react";

const REGION_OPTIONS = [
  ["Universal", "🌍 Universal"],
  ["UK", "🇬🇧 UK"],
  ["US", "🇺🇸 US"],
] as const;

function isRegionSelect(select: HTMLSelectElement) {
  const values = new Set(Array.from(select.options).map((option) => option.value));
  return REGION_OPTIONS.every(([value]) => values.has(value));
}

export default function SubmissionsLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    let frame = 0;

    const enhanceMobileCards = () => {
      if (window.innerWidth >= 768) return;

      const mobileCards = Array.from(document.querySelectorAll<HTMLDivElement>("div.md\\:hidden > div")).filter(
        (card) => Array.from(card.querySelectorAll("p")).some((p) => p.textContent?.trim().startsWith("Submission ID "))
      );

      const desktopRows = Array.from(document.querySelectorAll<HTMLTableRowElement>("table tbody tr")).filter((row) =>
        Array.from(row.querySelectorAll<HTMLSelectElement>("select")).some(isRegionSelect)
      );

      mobileCards.forEach((card, index) => {
        const desktopRow = desktopRows[index];
        if (!desktopRow) return;

        const sourceSelect = Array.from(desktopRow.querySelectorAll<HTMLSelectElement>("select")).find(isRegionSelect);
        if (!sourceSelect) return;

        const categoryLabel = Array.from(card.querySelectorAll<HTMLParagraphElement>("p")).find(
          (p) => p.textContent?.trim() === "Category"
        );
        const settingsGrid = categoryLabel?.parentElement?.parentElement;
        if (!settingsGrid) return;

        let wrapper = card.querySelector<HTMLDivElement>("[data-mobile-region-selector]");
        if (!wrapper) {
          wrapper = document.createElement("div");
          wrapper.dataset.mobileRegionSelector = "true";

          const label = document.createElement("p");
          label.className = "mb-1 text-xs text-gray-400";
          label.textContent = "Region";

          const select = document.createElement("select");
          select.className =
            "h-10 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 text-xs text-white outline-none";
          select.dataset.mobileRegionSelect = "true";

          REGION_OPTIONS.forEach(([value, text]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = text;
            select.appendChild(option);
          });

          wrapper.append(label, select);
          settingsGrid.insertAdjacentElement("afterend", wrapper);
        }

        const mobileSelect = wrapper.querySelector<HTMLSelectElement>("[data-mobile-region-select]");
        if (!mobileSelect) return;

        mobileSelect.value = sourceSelect.value || "Universal";
        mobileSelect.onchange = () => {
          const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
          valueSetter?.call(sourceSelect, mobileSelect.value);
          sourceSelect.dispatchEvent(new Event("change", { bubbles: true }));
        };
      });
    };

    const scheduleEnhancement = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(enhanceMobileCards);
    };

    scheduleEnhancement();

    const observer = new MutationObserver(scheduleEnhancement);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", scheduleEnhancement);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", scheduleEnhancement);
    };
  }, []);

  return <>{children}</>;
}
