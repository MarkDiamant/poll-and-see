import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const country =
    request.headers.get("x-vercel-ip-country")?.trim().toUpperCase() || "";

  const region = country === "US" ? "US" : "UK";

  return NextResponse.json({
    region,
  });
}