"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Region = "UK" | "US" | "All";

const REGION_STORAGE_KEY = "pollandsee-region";

export default function SiteHeader() {
  const [region, setRegion] = useState<Region | null>(null);

  useEffect(() => {
    const savedRegion = localStorage.getItem(REGION_STORAGE_KEY);

if (savedRegion === "UK" || savedRegion === "US") {
  setRegion(savedRegion);
  return;
}

if (savedRegion === "All") {
  setRegion("UK");
  localStorage.setItem(REGION_STORAGE_KEY, "UK");
  return;
}

    void fetch("/api/region")
      .then((response) => response.json())
      .then((data) => {
        const detectedRegion: Region = data.region === "US" ? "US" : "UK";
        setRegion(detectedRegion);
        localStorage.setItem(REGION_STORAGE_KEY, detectedRegion);
      })
      .catch(() => {
        setRegion("UK");
      });
  }, []);

  const changeRegion = (nextRegion: Region) => {
    setRegion(nextRegion);
    localStorage.setItem(REGION_STORAGE_KEY, nextRegion);
    window.dispatchEvent(
      new CustomEvent("pollandsee-region-change", {
        detail: nextRegion,
      })
    );
  };
  return (
    <header className="mx-auto max-w-6xl px-4 pb-4 pt-5 md:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex w-full items-center justify-between sm:w-auto sm:block">
          <Link href="/" className="shrink-0" aria-label="Go to homepage">
            <img
              src="/logo.png"
              alt="Poll & See"
              className="block h-12 w-auto object-contain md:h-16"
            />
          </Link>

          <Link
            href="/submit-poll"
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-500 sm:hidden"
          >
            Create Free Poll
          </Link>
        </div>

        <div className="flex w-full shrink-0 items-center justify-center gap-2 sm:w-auto sm:justify-end">
          <div className="mr-2 hidden rounded-lg border border-gray-700 bg-gray-900 p-0.5 sm:inline-flex">
            {(["UK", "US"] as Region[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeRegion(option)}
                className={`h-7 cursor-pointer rounded-md px-2.5 text-[11px] font-medium transition ${
                  region !== null && region === option
                    ? "bg-white text-black"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border border-gray-700 bg-gray-900 px-3 text-sm font-medium text-white transition hover:bg-gray-800 md:px-5"
          >
            Home
          </Link>

          <Link
            href="/advertise"
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border border-gray-700 bg-gray-900 px-3 text-sm font-medium text-white transition hover:bg-gray-800 md:px-5"
          >
            Advertise
          </Link>

          <Link
            href="/results"
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border border-gray-700 bg-gray-900 px-3 text-sm font-medium text-white transition hover:bg-gray-800 md:px-5"
          >
            Results
          </Link>

          <div className="ml-1 inline-flex shrink-0 rounded-md border border-gray-700 bg-gray-900 p-0.5 sm:hidden">
            {(["UK", "US"] as Region[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeRegion(option)}
                className={`h-6 cursor-pointer rounded px-1.5 text-[9px] font-medium transition ${
                  region !== null && region === option
                    ? "bg-white text-black"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <Link
            href="/submit-poll"
            className="hidden h-11 items-center justify-center whitespace-nowrap rounded-xl bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-500 sm:inline-flex md:px-5"
          >
            Create Free Poll
          </Link>
        </div>
      </div>
    </header>
  );
}