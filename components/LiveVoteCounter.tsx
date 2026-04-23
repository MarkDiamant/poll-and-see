"use client";

import { useEffect, useRef, useState } from "react";

export default function LiveVoteCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
const [animationFrom, setAnimationFrom] = useState(value);
const [animationTo, setAnimationTo] = useState(value);
const [isAnimating, setIsAnimating] = useState(false);
const [translateActive, setTranslateActive] = useState(false);
const [hasInitialised, setHasInitialised] = useState(false);

  const stepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
  if (!hasInitialised) {
    setDisplayValue(value);
    setAnimationFrom(value);
    setAnimationTo(value);
    setHasInitialised(true);
    return;
  }

  if (isAnimating || displayValue === value) return;

  const stepDelay = Math.abs(value - displayValue) > 10 ? 180 : 340;

    stepTimeoutRef.current = setTimeout(() => {
      const direction = value > displayValue ? 1 : -1;
      const nextValue = displayValue + direction;

      setAnimationFrom(displayValue);
      setAnimationTo(nextValue);
      setIsAnimating(true);
      setTranslateActive(false);

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = window.requestAnimationFrame(() => {
          setTranslateActive(true);
        });
      });

      settleTimeoutRef.current = setTimeout(() => {
        setDisplayValue(nextValue);
        setIsAnimating(false);
        setTranslateActive(false);
      }, 1100);
    }, stepDelay);

    return () => {
      if (stepTimeoutRef.current) {
        clearTimeout(stepTimeoutRef.current);
      }
    };
  }, [value, displayValue, isAnimating, hasInitialised]);

  useEffect(() => {
    return () => {
      if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const settledFormatted = displayValue.toLocaleString();
  const fromFormatted = animationFrom.toLocaleString();
  const toFormatted = animationTo.toLocaleString();

  const getCommonPrefixLength = (a: string, b: string) => {
    const maxLength = Math.min(a.length, b.length);
    let i = 0;

    while (i < maxLength && a[i] === b[i]) {
      i += 1;
    }

    return i;
  };

  const commonPrefixLength = isAnimating
    ? getCommonPrefixLength(fromFormatted, toFormatted)
    : settledFormatted.length;

  const stablePrefix = isAnimating
    ? fromFormatted.slice(0, commonPrefixLength)
    : settledFormatted;

  const previousSuffix = isAnimating ? fromFormatted.slice(commonPrefixLength) : "";
  const nextSuffix = isAnimating ? toFormatted.slice(commonPrefixLength) : "";

  const fixedWidthCh = Math.max(
    settledFormatted.length,
    fromFormatted.length,
    toFormatted.length,
    value.toLocaleString().length
  );

  const suffixWidthCh = Math.max(previousSuffix.length, nextSuffix.length, 1);

  return (
    <div className="mb-1 mt-4 text-center">
      <div className="inline-flex h-[104px] min-w-[206px] flex-col items-center justify-center rounded-2xl border border-cyan-400/55 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),_rgba(8,15,30,0.98)_56%)] px-6 py-3 shadow-[0_0_44px_rgba(34,211,238,0.20)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100 md:text-[11px]">
          Total Votes Cast
        </p>

        <div
          className="mt-2 flex h-[56px] items-center justify-center overflow-hidden text-4xl font-bold leading-none text-white tabular-nums md:text-5xl"
          style={{ minWidth: `${fixedWidthCh}ch` }}
        >
          <span className="whitespace-pre">{stablePrefix}</span>

          {isAnimating ? (
            <span
              className="relative inline-flex overflow-hidden whitespace-pre align-middle"
              style={{
                height: "1.28em",
                minWidth: `${suffixWidthCh}ch`,
                paddingRight: "0.03em",
              }}
            >
              <span
                className="absolute left-0 top-0 flex w-full flex-col ease-out"
                style={{
                  transform: translateActive ? "translateY(-1.28em)" : "translateY(0)",
                  transitionDuration: translateActive ? "1100ms" : "0ms",
                  transitionProperty: "transform",
                }}
              >
                <span
                  className="flex items-center justify-center leading-none"
                  style={{ height: "1.28em" }}
                >
                  {previousSuffix}
                </span>
                <span
                  className="flex items-center justify-center leading-none"
                  style={{ height: "1.28em" }}
                >
                  {nextSuffix}
                </span>
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}