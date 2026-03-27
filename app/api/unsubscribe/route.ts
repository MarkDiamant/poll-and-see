import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new NextResponse("Unsubscribe is not configured.", { status: 500 });
  }

  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return new NextResponse("Missing email.", { status: 400 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  await supabaseAdmin
    .from("subscribers")
    .update({ is_active: false })
    .eq("email", email);

  return new NextResponse(
    `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Unsubscribed</title>
          <style>
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              background: #000;
              color: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 24px;
            }
            .box {
              max-width: 520px;
              width: 100%;
              background: #1f2937;
              border: 1px solid #374151;
              border-radius: 16px;
              padding: 24px;
              text-align: center;
            }
            a {
              color: #93c5fd;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>You have been unsubscribed.</h1>
            <p>You will no longer receive daily new poll emails.</p>
            <p><a href="/">Return to Poll & See</a></p>
          </div>
        </body>
      </html>
    `,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    }
  );
}