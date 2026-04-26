import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

const SITE_URL = "https://www.pollandsee.com";

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

function getFontSize(question: string) {
  const length = question.length;
  if (length <= 40) return 94;
  if (length <= 80) return 78;
  if (length <= 120) return 64;
  return 52;
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

  words.forEach((word) => {
    const next = [...current, word].join(" ");

    if (next.length <= maxChars || current.length === 0) {
      current.push(word);
    } else {
      lines.push(current);
      current = [word];
    }
  });

  if (current.length > 0) lines.push(current);

  while (lines.length > 4) {
    const extra = lines.pop();
    if (extra) lines[lines.length - 1] = [...lines[lines.length - 1], ...extra];
  }

  if (lines.length > 1 && lines[lines.length - 1].length === 1 && lines[lines.length - 2].length > 2) {
    const moved = lines[lines.length - 2].pop();
    if (moved) lines[lines.length - 1] = [moved, ...lines[lines.length - 1]];
  }

  return lines;
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
          background: "#030827",
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "white",
        }}
      >
        {/* background glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 4% -8%, rgba(190,0,255,0.55), transparent 28%), radial-gradient(circle at 98% -4%, rgba(226,0,196,0.52), transparent 30%), radial-gradient(circle at 50% 43%, rgba(16,28,82,0.88), transparent 62%), linear-gradient(180deg, #05072a 0%, #02051c 100%)",
          }}
        />

        {/* top-left check mark */}
        <div
          style={{
            position: "absolute",
            left: "-48px",
            top: "66px",
            width: "205px",
            height: "72px",
            borderRadius: "42px",
            background: "linear-gradient(135deg, #eb12d8 0%, #2535d8 100%)",
            transform: "rotate(42deg)",
            opacity: 0.78,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "66px",
            top: "34px",
            width: "150px",
            height: "74px",
            borderRadius: "45px",
            background: "linear-gradient(135deg, #2736e5 0%, #1d2aad 100%)",
            transform: "rotate(-47deg)",
            opacity: 0.84,
          }}
        />

        {/* top-right speech bubble */}
        <div
          style={{
            position: "absolute",
            right: "66px",
            top: "47px",
            width: "165px",
            height: "93px",
            borderRadius: "31px",
            border: "8px solid #b000ff",
            opacity: 0.82,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "120px",
            top: "126px",
            width: "66px",
            height: "42px",
            borderRadius: "12px",
            borderLeft: "8px solid #b000ff",
            borderBottom: "8px solid #b000ff",
            transform: "rotate(-12deg)",
            opacity: 0.75,
          }}
        />

        {/* right poll bars */}
        <div
          style={{
            position: "absolute",
            right: "-6px",
            top: "210px",
            display: "flex",
            gap: "12px",
            alignItems: "flex-end",
            transform: "rotate(13deg)",
            opacity: 0.43,
          }}
        >
          <div style={{ width: 36, height: 50, borderRadius: 8, background: "#1322b9" }} />
          <div style={{ width: 36, height: 92, borderRadius: 8, background: "#2436e8" }} />
          <div style={{ width: 36, height: 142, borderRadius: 8, background: "#8200ff" }} />
        </div>

        {/* bottom accents */}
        <div
          style={{
            position: "absolute",
            left: "-74px",
            bottom: "-135px",
            width: "270px",
            height: "292px",
            borderRadius: "95px",
            border: "52px solid transparent",
            borderLeftColor: "#a5f545",
            borderTopColor: "#16c6e9",
            transform: "rotate(-21deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "-105px",
            bottom: "-84px",
            width: "285px",
            height: "285px",
            borderRadius: "999px",
            border: "50px solid transparent",
            borderLeftColor: "#ec12ad",
            borderTopColor: "#a500ff",
            transform: "rotate(-18deg)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <img
            src={`${SITE_URL}/logo.png`}
            width="350"
            height="90"
            style={{
              objectFit: "contain",
              marginTop: "42px",
              marginBottom: "20px",
            }}
          />

          {/* question */}
          <div
            style={{
              width: "1085px",
              minHeight: "286px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              lineHeight: 1.06,
              fontWeight: 900,
              fontSize,
              letterSpacing: "-3.8px",
              textShadow: "0 3px 6px rgba(255,255,255,0.16)",
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
                  marginBottom: "8px",
                }}
              >
                {line.map((word, wordIndex) => {
                  const currentWordIndex =
                    lines.slice(0, lineIndex).reduce((sum, currentLine) => sum + currentLine.length, 0) +
                    wordIndex;

                  const isLast = currentWordIndex === flattenedWords.length - 1;

                  return (
                    <span
                      key={`${lineIndex}-${wordIndex}`}
style={{
  color: isLast ? "#35d8f2" : "#ffffff",
}}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #29bfff",
              borderLeftColor: "#b7f238",
              borderRadius: "26px",
              padding: "19px 55px",
              marginTop: "-1px",
              fontSize: "34px",
              fontWeight: 750,
              color: "#ffffff",
              boxShadow: "0 0 20px rgba(38,191,255,0.34)",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                marginRight: "26px",
                borderRadius: "999px",
                border: "4px solid #b7f238",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-end", gap: "5px" }}>
                <div style={{ width: 8, height: 18, border: "3px solid #b7f238", borderRadius: 3 }} />
                <div style={{ width: 8, height: 30, border: "3px solid #26bfff", borderRadius: 3 }} />
                <div style={{ width: 8, height: 43, border: "3px solid #ec12ad", borderRadius: 3 }} />
              </div>
            </div>

            <span>Vote and see what others think</span>
          </div>

          {/* bottom line */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "22px",
              fontSize: "28px",
              fontWeight: 550,
              color: "#ffffff",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "46px",
                border: "4px solid #b7f238",
                borderRadius: "9px 9px 13px 13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#b7f238",
                fontSize: "22px",
                fontWeight: 900,
              }}
            >
              ✓
            </div>
            <span>Anonymous</span>
            <span style={{ color: "#b7f238" }}>•</span>
            <span>Quick</span>
            <span style={{ color: "#b7f238" }}>•</span>
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