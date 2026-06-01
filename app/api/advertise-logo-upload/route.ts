import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET_NAME = "sponsor-logos";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function getAdminClient() {
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Logo file is required." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Logo must be under 5MB." }, { status: 400 });
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Please upload PNG, JPG, WEBP or SVG." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getAdminClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `enquiries/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: "Could not upload logo." }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(path);

    return NextResponse.json({ url: data.publicUrl });
  } catch {
    return NextResponse.json({ error: "Could not upload logo." }, { status: 500 });
  }
}