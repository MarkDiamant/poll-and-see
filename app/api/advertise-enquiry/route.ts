import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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
    const body = await request.json();

    const enquiryType = body.enquiryType === "question" ? "question" : "booking";
    const name = String(body.name || "").trim();
    const businessName = String(body.businessName || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const destination = String(body.destination || "").trim();
    const categories = Array.isArray(body.categories) ? body.categories.map(String) : [];
    const days = Number(body.days || 0);
    const preferredStartDate = String(body.preferredStartDate || "").trim();
    const headline = String(body.headline || "").trim();
    const ctaText = String(body.ctaText || "").trim();
    const logoUrl = String(body.logoUrl || "").trim();
    const theme = String(body.theme || "").trim();
    const message = String(body.message || "").trim();
    const region = ["UK", "US", "Universal"].includes(String(body.region))
      ? String(body.region)
      : "UK";

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }

    if (enquiryType === "booking" && !businessName) {
      return NextResponse.json(
        { error: "Business name is required." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getAdminClient();

    const { error: insertError } = await supabaseAdmin
      .from("advertiser_enquiries")
      .insert({
        enquiry_type: enquiryType,
        status: "new",
        name,
        business_name: businessName || null,
        email,
        phone: phone || null,
        destination: destination || null,
        categories: categories.join(",") || null,
        days: Number.isFinite(days) && days > 0 ? days : null,
        region,
        preferred_start_date: preferredStartDate || null,
        headline: headline || null,
        cta_text: ctaText || null,
        logo_url: logoUrl || null,
        theme: theme || null,
        message: message || null,
      });

    if (insertError) {
      return NextResponse.json(
        { error: "Could not save enquiry." },
        { status: 500 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM;
    const toEmail = process.env.ADVERTISING_ENQUIRY_TO || "hello@pollandsee.com";

    if (resendApiKey && fromEmail) {
      const html = `
        <h2>New Poll & See ${enquiryType === "question" ? "advertising question" : "advertiser booking enquiry"}</h2>
        <p><strong>Type:</strong> ${escapeHtml(enquiryType)}</p>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Business:</strong> ${escapeHtml(businessName || "Not provided")}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone/WhatsApp:</strong> ${escapeHtml(phone || "Not provided")}</p>
        <p><strong>Destination:</strong> ${escapeHtml(destination || "Not provided")}</p>
        <p><strong>Categories:</strong> ${escapeHtml(categories.join(", ") || "Not provided")}</p>
        <p><strong>Market:</strong> ${escapeHtml(
          region === "Universal" ? "UK + US" : region
        )}</p>
        <p><strong>Days:</strong> ${escapeHtml(days ? String(days) : "Not provided")}</p>
        <p><strong>Preferred start date:</strong> ${escapeHtml(preferredStartDate || "Not provided")}</p>
        <p><strong>Headline:</strong> ${escapeHtml(headline || "Not provided")}</p>
        <p><strong>CTA text:</strong> ${escapeHtml(ctaText || "Not provided")}</p>
        <p><strong>Logo URL:</strong> ${escapeHtml(logoUrl || "Not provided")}</p>
        <p><strong>Theme:</strong> ${escapeHtml(theme || "Not provided")}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message || "None").replaceAll("\n", "<br />")}</p>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: toEmail,
          subject:
            enquiryType === "question"
              ? `Advertising question: ${name}`
              : `Advertiser booking: ${businessName || name}`,
          html,
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not send enquiry." },
      { status: 500 }
    );
  }
}