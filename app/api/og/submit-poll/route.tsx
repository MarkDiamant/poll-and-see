import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";
export const revalidate = 86400;

export async function GET(request: NextRequest) {
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
            left: "90px",
            right: "90px",
            top: "150px",
            height: "300px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            lineHeight: 1.04,
            fontWeight: 900,
            fontSize: 74,
            letterSpacing: "-3.5px",
            color: "#ffffff",
            textShadow: "0 3px 10px rgba(0,0,0,0.45)",
          }}
        >
          <div>Create your own poll</div>
          <div>in seconds</div>
          <div
            style={{
              marginTop: "24px",
              fontSize: 38,
              fontWeight: 700,
              letterSpacing: "-1px",
              color: "#a5f545",
            }}
          >
            Ask anything anonymously
          </div>
          <div
            style={{
              marginTop: "10px",
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: "-1px",
              color: "#22d3ee",
            }}
          >
            See what people really think
          </div>
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