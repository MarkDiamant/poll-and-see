import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const country = request.headers.get("x-vercel-ip-country")?.toUpperCase();

  return NextResponse.json({
    region: country === "US" ? "US" : "UK",
  });
}