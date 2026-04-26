import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

const SITE_URL = "https://www.pollandsee.com";

function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function getFontSize(question: string) {
  const length = question.length;
  if (length <= 40) return 100;
  if (length <= 80) return 82;
  if (length <= 120) return 66;
  return 54;
}

function getLineLimit(question: string) {
  const length = question.length;
  if (length <= 40) return 18;
  if (length <= 80) return 25;
  if (length <= 120) return 32;
  return 39;
}

function splitQuestion(question: string) {
  const words = question.trim().split(/\s+/).filter(Boolean);
  const maxChars = getLineLimit(question);
  const lines: string[][] = [];
  let current: string[] = [];

  for (const word of words) {
    const next = [...current, word].join(" ");

    if (next.length <= maxChars || current.length === 0) {
      current.push(word);
    } else {
      lines.push(current);
      current = [word];
    }
  }

  if (current.length > 0) lines.push(current);

  while (lines.length > 4) {
    const extra = lines.pop();
    if (extra) lines[lines.length - 1] = [...lines[lines.length - 1], ...extra];
  }

  if (
    lines.length > 1 &&
    lines[lines.length - 1].length === 1 &&
    lines[lines.length - 2].length > 2
  ) {
    const moved = lines[lines.length - 2].pop();
    if (moved) lines[lines.length - 1] = [moved, ...lines[lines.length - 1]];
  }

  return lines;
}

function getGradientColour(index: number, total: number) {
  if (total <= 1) return "#22d3ee";

  const colours = ["#a5f545", "#7ee75b", "#22d3ee", "#38bdf8"];
  const colourIndex = Math.min(
    colours.length - 1,
    Math.floor((index / Math.max(total - 1, 1)) * colours.length)
  );

  return colours[colourIndex];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") || "").trim();

  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from("polls")
    .select("question")
    .eq("slug", slug)
    .maybeSingle();

  const question = data?.question || "Poll not found";
  const lines = splitQuestion(question);
  const fontSize = getFontSize(question);
  const flattenedWords = lines.flat();

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <img
          src={new URL("/og-bg.png", request.url).toString()}
          width="1200"
          height="630"
          style={{
            position: "absolute",
            inset: 0,
            width: "1200px",
            height: "630px",
            objectFit: "cover",
          }}
        />

<div
  style={{
    position: "absolute",
    left: "70px",
    right: "70px",
    top: "150px", // 👈 move UP (was 185)
    height: "240px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    lineHeight: 1.02,
    fontWeight: 900, // 👈 thicker (max weight)
    fontSize: fontSize + 6,
    letterSpacing: "-4.5px",
    color: "#ffffff",
textShadow: "0 2px 6px rgba(255,255,255,0.12)", // 👈 clean, crisp
  }}
>
          {lines.map((line, lineIndex) => (
            <div
              key={`line-${lineIndex}`}
              style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: "0.25em",
                marginBottom: "4px",
              }}
            >
              {line.map((word, wordIndex) => {
                const currentWordIndex =
                  lines.slice(0, lineIndex).reduce((sum, currentLine) => sum + currentLine.length, 0) +
                  wordIndex;

                const isLast = currentWordIndex === flattenedWords.length - 1;
                const letters = word.split("");

                if (!isLast) {
                  return (
                    <span key={`${lineIndex}-${wordIndex}`}>
                      {word}
                    </span>
                  );
                }

                return (
                  <span
                    key={`${lineIndex}-${wordIndex}`}
                    style={{
                      display: "flex",
                    }}
                  >
                    {letters.map((letter, letterIndex) => (
                      <span
                        key={`${lineIndex}-${wordIndex}-${letterIndex}`}
                        style={{
                          color: getGradientColour(letterIndex, letters.length),
                        }}
                      >
                        {letter}
                      </span>
                    ))}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}