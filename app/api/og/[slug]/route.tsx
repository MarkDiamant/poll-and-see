import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const revalidate = 2592000; // 30 days

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
  if (length <= 30) return 110;
  if (length <= 50) return 92;
  if (length <= 80) return 72;
  if (length <= 120) return 58;
  return 48;
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await context.params;
 const slug = rawSlug.replace(/^\/+/, "").replace(/\.png$/, "").trim();

  const supabase = getSupabaseServerClient();

const { data, error } = await supabase
  .from("polls")
  .select("id, question, slug")
  .eq("slug", slug)
  .maybeSingle();

const question = error
  ? `OG error: ${error.message}`
  : data?.question || `Poll not found: ${slug}`;
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
    left: "-60px",
    top: "-32px",
    width: "1320px",
    height: "694px",
    objectFit: "cover",
  }}
/>

<div
  style={{
    position: "absolute",
    left: "70px",
    right: "70px",
    top: "165px", // 👈 move UP (was 185)
    height: "230px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  lineHeight: 1.04,
    fontWeight: 900, // 👈 thicker (max weight)
    fontSize: fontSize,
    letterSpacing: "-3px",
    color: "#ffffff",
textShadow: "0 3px 10px rgba(0,0,0,0.45)",
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
  headers: {
    "Cache-Control": "public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=604800",
    "X-Robots-Tag": "noindex",
  },
}
  );
}