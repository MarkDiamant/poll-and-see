import { NextRequest, NextResponse } from "next/server";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const businessName = String(body.businessName || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const destination = String(body.destination || "").trim();
    const categories = Array.isArray(body.categories) ? body.categories.map(String) : [];
    const days = String(body.days || "").trim();
    const preferredStartDate = String(body.preferredStartDate || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !businessName || !email) {
      return NextResponse.json(
        { error: "Name, business name and email are required." },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM;
    const toEmail = process.env.ADVERTISING_ENQUIRY_TO || "hello@pollandsee.com";

    if (!resendApiKey || !fromEmail) {
      return NextResponse.json(
        { error: "Advertising enquiry email is not configured." },
        { status: 500 }
      );
    }

    const html = `
      <h2>New Poll & See sponsor enquiry</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Business:</strong> ${escapeHtml(businessName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone/WhatsApp:</strong> ${escapeHtml(phone || "Not provided")}</p>
      <p><strong>Destination:</strong> ${escapeHtml(destination || "Not provided")}</p>
      <p><strong>Categories:</strong> ${escapeHtml(categories.join(", ") || "Not provided")}</p>
      <p><strong>Days:</strong> ${escapeHtml(days || "Not provided")}</p>
      <p><strong>Preferred start date:</strong> ${escapeHtml(preferredStartDate || "Not provided")}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message || "None").replaceAll("\n", "<br />")}</p>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail,
        subject: `Sponsor enquiry: ${businessName}`,
        html,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not send enquiry." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not send enquiry." },
      { status: 500 }
    );
  }
}