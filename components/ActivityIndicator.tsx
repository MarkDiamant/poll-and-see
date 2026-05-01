"use client";

import { useEffect, useRef, useState } from "react";

const ACTIVITY_INDICATOR_THRESHOLD = 500;
const ACTIVITY_INDICATOR_COOLDOWN_MS = 30 * 60 * 1000;
const ACTIVITY_INDICATOR_LAST_SHOWN_KEY = "activity_indicator_last_shown";

export default function ActivityIndicator({
  votesLast24,
}: {
  votesLast24: number;
}) {
  const [showActivityIndicator, setShowActivityIndicator] = useState(false);

  const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    if (votesLast24 < ACTIVITY_INDICATOR_THRESHOLD) {
      setShowActivityIndicator(false);
      return;
    }

    if (runningRef.current) {
      return;
    }

    const lastShownAt = Number(
      localStorage.getItem(ACTIVITY_INDICATOR_LAST_SHOWN_KEY) || 0
    );

    if (Date.now() - lastShownAt < ACTIVITY_INDICATOR_COOLDOWN_MS) {
      return;
    }

    runningRef.current = true;
    localStorage.setItem(ACTIVITY_INDICATOR_LAST_SHOWN_KEY, String(Date.now()));

    initialTimeoutRef.current = setTimeout(() => {
      setShowActivityIndicator(true);

      hideTimeoutRef.current = setTimeout(() => {
        setShowActivityIndicator(false);
        runningRef.current = false;
      }, 5000);
    }, 3000);
  }, [votesLast24]);

  useEffect(() => {
    return () => {
      if (initialTimeoutRef.current) {
        clearTimeout(initialTimeoutRef.current);
      }

      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  if (votesLast24 < ACTIVITY_INDICATOR_THRESHOLD) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none fixed right-5 top-20 z-40 transition-opacity duration-700 md:left-1/2 md:right-auto md:top-24 md:-translate-x-[-360px] ${
        showActivityIndicator ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="rounded-xl border border-blue-400/50 bg-blue-950/80 px-4 py-3 shadow-[0_0_24px_rgba(59,130,246,0.18)] backdrop-blur md:rounded-2xl md:px-5 md:py-4">
        <p className="text-sm font-medium text-blue-50 md:text-base">
          {votesLast24.toLocaleString()} votes in the last 24 hours
        </p>
      </div>
    </div>
  );
}