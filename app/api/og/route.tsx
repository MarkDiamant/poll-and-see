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
  if (length <= 40) return 86;
  if (length <= 80) return 74;
  if (length <= 120) return 62;
  return 52;
}

function getLineLimit(question: string) {
  const length = question.length;
  if (length <= 40) return 20;
  if (length <= 80) return 26;
  if (length <= 120) return 32;
  return 38;
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
  const lastWordIndex = question.trim().split(/\s+/).filter(Boolean).length - 1;

  let wordCounter = 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#050b24",
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "white",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 6% 0%, rgba(190, 0, 255, 0.48), transparent 28%), radial-gradient(circle at 94% 0%, rgba(224, 0, 205, 0.42), transparent 30%), radial-gradient(circle at 50% 48%, rgba(24, 38, 96, 0.6), transparent 55%), linear-gradient(180deg, #050729 0%, #050b24 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "-74px",
            top: "96px",
            width: "238px",
            height: "78px",
            borderRadius: "42px",
            background: "linear-gradient(135deg, #ec00d9, #2936d8)",
            transform: "rotate(-40deg)",
            opacity: 0.78,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "52px",
            top: "42px",
            width: "132px",
            height: "48px",
            borderRadius: "34px",
            background: "#2936d8",
            transform: "rotate(-40deg)",
            opacity: 0.82,
          }}
        />

        <div
          style={{
            position: "absolute",
            right: "70px",
            top: "52px",
            width: "160px",
            height: "88px",
            borderRadius: "28px",
            border: "7px solid #b000ff",
            opacity: 0.75,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "118px",
            top: "130px",
            width: "76px",
            height: "34px",
            borderRadius: "12px",
            border: "6px solid #2630c9",
            transform: "rotate(8deg)",
            opacity: 0.55,
          }}
        />

        <div
          style={{
            position: "absolute",
            right: "0px",
            top: "184px",
            display: "flex",
            gap: "12px",
            alignItems: "flex-end",
            transform: "rotate(12deg)",
            opacity: 0.42,
          }}
        >
          <div style={{ width: 36, height: 54, borderRadius: 8, background: "#1727ca" }} />
          <div style={{ width: 36, height: 96, borderRadius: 8, background: "#2536f0" }} />
          <div style={{ width: 36, height: 142, borderRadius: 8, background: "#8900ff" }} />
        </div>

        <div
          style={{
            position: "absolute",
            left: "-58px",
            bottom: "-112px",
            width: "245px",
            height: "265px",
            borderRadius: "80px",
            border: "48px solid transparent",
            borderLeftColor: "#94f043",
            borderTopColor: "#22c9d6",
            transform: "rotate(-20deg)",
            opacity: 0.98,
          }}
        />

        <div
          style={{
            position: "absolute",
            right: "-92px",
            bottom: "-70px",
            width: "260px",
            height: "260px",
            borderRadius: "999px",
            border: "46px solid transparent",
            borderLeftColor: "#ec0fa9",
            borderTopColor: "#a400ff",
            transform: "rotate(-20deg)",
            opacity: 0.95,
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
            width="360"
            height="96"
            style={{
              objectFit: "contain",
              marginTop: "42px",
              marginBottom: "32px",
            }}
          />

          <div
            style={{
              width: "1050px",
              minHeight: "270px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              lineHeight: 1.08,
              fontWeight: 900,
              fontSize,
              letterSpacing: "-3px",
              textShadow: "0 3px 7px rgba(255,255,255,0.16)",
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
                  const isLast = wordCounter === lastWordIndex;
                  wordCounter += 1;

                  return (
                    <span
                      key={`${lineIndex}-${wordIndex}`}
                      style={{
                        color: isLast ? "#41d9f4" : "#ffffff",
                        backgroundImage: isLast
                          ? "linear-gradient(90deg, #b7f238 0%, #38e0d5 70%, #30c8ff 100%)"
                          : "none",
                        backgroundClip: isLast ? "text" : "border-box",
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
              border: "3px solid #26bfff",
              borderLeftColor: "#b7f238",
              borderRadius: "25px",
              padding: "21px 58px",
              marginTop: "4px",
              fontSize: "35px",
              fontWeight: 700,
              color: "#ffffff",
              boxShadow: "0 0 22px rgba(38,191,255,0.32)",
            }}
          >
            <span style={{ marginRight: "24px", fontSize: "42px", color: "#b7f238" }}>◉</span>
            Vote and see what others think
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "24px",
              fontSize: "28px",
              fontWeight: 500,
              color: "#ffffff",
            }}
          >
            <span style={{ color: "#b7f238", fontSize: "30px" }}>▢</span>
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