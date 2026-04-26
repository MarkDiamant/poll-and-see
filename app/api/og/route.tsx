import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

const SITE_URL = "https://www.pollandsee.com";

function getFontSize(question: string) {
  const length = question.length;

  if (length <= 40) return 82;
  if (length <= 80) return 68;
  if (length <= 120) return 56;
  return 46;
}

function getMaxCharsPerLine(question: string) {
  const length = question.length;

  if (length <= 40) return 18;
  if (length <= 80) return 24;
  if (length <= 120) return 30;
  return 36;
}

function splitQuestion(question: string) {
  const words = question.trim().split(/\s+/).filter(Boolean);
  const maxChars = getMaxCharsPerLine(question);
  const maxLines = 4;
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

    if (lines.length === maxLines - 1) break;
  }

  const usedWords = lines.flat().length + current.length;
  const remaining = words.slice(usedWords);

  if (remaining.length > 0) {
    current = [...current, ...remaining];
  }

  if (current.length > 0) {
    lines.push(current);
  }

  while (lines.length > maxLines) {
    const extra = lines.pop();
    if (extra && lines.length > 0) {
      lines[lines.length - 1] = [...lines[lines.length - 1], ...extra];
    }
  }

  const lastLine = lines[lines.length - 1];

  if (
    lines.length > 1 &&
    lastLine.length === 1 &&
    lines[lines.length - 2].length > 2
  ) {
    const moved = lines[lines.length - 2].pop();

    if (moved) {
      lines[lines.length - 1] = [moved, ...lastLine];
    }
  }

  return lines;
}

function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") || "";

  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from("polls")
    .select("question")
    .eq("slug", slug)
    .maybeSingle();

  const question = data?.question || "What do you think?";
  const lines = splitQuestion(question);
  const fontSize = getFontSize(question);
  const lastWord = question.trim().split(/\s+/).filter(Boolean).at(-1) || "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #ffffff 0%, #f8fbff 42%, #f2f7ff 100%)",
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "#06111f",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "420px",
            height: "420px",
            left: "-160px",
            bottom: "-160px",
            borderRadius: "999px",
            background: "linear-gradient(135deg, #a3e635, #06b6d4)",
            opacity: 0.8,
          }}
        />

        <div
          style={{
            position: "absolute",
            width: "360px",
            height: "360px",
            right: "-130px",
            bottom: "-120px",
            borderRadius: "999px",
            background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
            opacity: 0.75,
          }}
        />

        <div
          style={{
            position: "absolute",
            width: "260px",
            height: "260px",
            left: "58px",
            top: "42px",
            borderRadius: "70px",
            border: "22px solid rgba(139, 92, 246, 0.18)",
            transform: "rotate(-28deg)",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: "80px",
            top: "58px",
            width: "170px",
            height: "105px",
            borderRadius: "28px",
            border: "10px solid rgba(6, 182, 212, 0.24)",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: "110px",
            top: "245px",
            display: "flex",
            gap: "14px",
            alignItems: "flex-end",
            opacity: 0.22,
          }}
        >
          <div style={{ width: 34, height: 82, borderRadius: 10, background: "#2563eb" }} />
          <div style={{ width: 34, height: 125, borderRadius: 10, background: "#8b5cf6" }} />
          <div style={{ width: 34, height: 172, borderRadius: 10, background: "#06b6d4" }} />
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "58px 86px 48px",
          }}
        >
          <img
            src={`${SITE_URL}/logo.png`}
            width="330"
            height="92"
            style={{
              objectFit: "contain",
              marginBottom: "32px",
            }}
          />

          <div
            style={{
              flex: 1,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              lineHeight: 1.08,
              fontWeight: 800,
              letterSpacing: "-2px",
              fontSize,
            }}
          >
            {lines.map((line, lineIndex) => (
              <div
                key={`line-${lineIndex}`}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: "0.28em",
                  marginBottom: "6px",
                }}
              >
                {line.map((word, wordIndex) => {
                  const isLast =
                    lineIndex === lines.length - 1 &&
                    wordIndex === line.length - 1 &&
                    word.replace(/[^\w?!.]/g, "") === lastWord.replace(/[^\w?!.]/g, "");

                  return (
                    <span
                      key={`${lineIndex}-${wordIndex}`}
                      style={{
                        color: isLast ? "#06b6d4" : "#06111f",
                      }}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "4px solid #06b6d4",
              borderRadius: "28px",
              padding: "22px 42px",
              marginTop: "18px",
              fontSize: "34px",
              fontWeight: 700,
              color: "#06111f",
              background: "rgba(255,255,255,0.72)",
            }}
          >
            Vote and see what others think
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              marginTop: "26px",
              fontSize: "28px",
              fontWeight: 600,
              color: "#1f2937",
            }}
          >
            <span>Anonymous</span>
            <span style={{ color: "#84cc16" }}>•</span>
            <span>Quick</span>
            <span style={{ color: "#84cc16" }}>•</span>
            <span>Real Results</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}