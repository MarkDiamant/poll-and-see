import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PollRow = {
  id: number;
  question: string;
  category: string;
  slug: string;
  created_at: string;
  poll_options: string[] | null;
};

type SubscriberRow = {
  id: number;
  email: string;
  category_preferences: string[] | null;
  is_active: boolean;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildDigestEmail(params: {
  polls: PollRow[];
  appBaseUrl: string;
  unsubscribeUrl: string;
}) {

  const logoUrl = `${params.appBaseUrl}/logo.png`;

  const pollsHtml = params.polls
    .map((poll) => {

      const pollUrl = `${params.appBaseUrl}/poll/${poll.slug}`;

      const optionsHtml = (poll.poll_options || [])
        .slice(0, 4)
        .map(option => `
          <div
            style="
              font-family: Arial, sans-serif;
              font-size: 15px;
              line-height: 20px;
              color: #e2e8f0;
              background: #334155;
              border-radius: 14px;
              padding: 12px 14px;
              margin-bottom: 8px;
            "
          >
            ${escapeHtml(option)}
          </div>
        `)
        .join("");

      return `
        <tr>
          <td style="padding: 0 0 18px 0;">

            <table
              role="presentation"
              width="100%"
              cellpadding="0"
              cellspacing="0"
              border="0"
              style="
                width: 100%;
                background: #1e293b;
                border-radius: 26px;
                border: 1px solid #334155;
                padding: 20px;
              "
            >

              <tr>
                <td>

                  <div style="margin-bottom:14px;">

                    <span
                      style="
                        font-family: Arial, sans-serif;
                        font-size: 12px;
                        padding:6px 12px;
                        border-radius:999px;
                        border:1px solid #ef4444;
                        color:#fca5a5;
                      "
                    >
                      ${escapeHtml(poll.category)}
                    </span>

                  </div>


                  <div
                    style="
                      font-family: Arial, sans-serif;
                      font-size: 20px;
                      line-height: 30px;
                      font-weight: 700;
                      color: #ffffff;
                      margin-bottom: 16px;
                    "
                  >
                    ${escapeHtml(poll.question)}
                  </div>


                  ${optionsHtml}


                  <div style="margin-top:14px;">

                    <a
                      href="${pollUrl}"
                      style="
                        display:inline-block;
                        background:#2563eb;
                        color:white;
                        padding:14px 22px;
                        border-radius:999px;
                        font-family: Arial, sans-serif;
                        font-weight:700;
                        font-size:15px;
                        text-decoration:none;
                      "
                    >
                      Vote now
                    </a>

                  </div>

                </td>
              </tr>

            </table>

          </td>
        </tr>
      `;
    })
    .join("");



  const pollsText = params.polls
    .map(poll => {

      const pollUrl = `${params.appBaseUrl}/poll/${poll.slug}`;

      const optionsText = (poll.poll_options || [])
        .map(option => `• ${option}`)
        .join("\n");

      return `${poll.question}

${optionsText}

Vote:
${pollUrl}`;

    })
    .join("\n\n--------------------\n\n");



  const html = `
  <html>
  <body style="margin:0;padding:0;background:#020617;">

  <table width="100%" cellpadding="0" cellspacing="0">

    <tr>
      <td align="center" style="padding:30px 16px;">

        <table width="640" style="max-width:100%;">

          <tr>
            <td align="center" style="padding-bottom:26px;">

              <a href="${params.appBaseUrl}">
                <img
                  src="${logoUrl}"
                  width="180"
                  style="display:block;border:0;"
                />
              </a>

            </td>
          </tr>



          <tr>
            <td style="padding-bottom:22px;">

              <table
                width="100%"
                style="
                  background:#0f172a;
                  border-radius:26px;
                  border:1px solid #1e293b;
                  padding:28px 22px;
                  text-align:center;
                "
              >

                <tr>
                  <td
                    style="
                      font-family:Arial;
                      font-size:30px;
                      font-weight:800;
                      color:white;
                      padding-bottom:10px;
                    "
                  >
                    New polls today
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      font-family:Arial;
                      font-size:16px;
                      color:#cbd5e1;
                    "
                  >
                    Fresh questions are live now. Tap into today’s polls.
                  </td>
                </tr>

              </table>

            </td>
          </tr>



          ${pollsHtml}



          <tr>
            <td style="padding-top:10px;">

              <table
                width="100%"
                style="
                  background:#0f172a;
                  border-radius:26px;
                  border:1px solid #1e293b;
                  padding:20px;
                  text-align:center;
                "
              >

                <tr>
                  <td
                    style="
                      font-family:Arial;
                      font-size:14px;
                      color:#94a3b8;
                      padding-bottom:12px;
                    "
                  >
                    You are receiving this email because you subscribed to Poll & See.
                  </td>
                </tr>

                <tr>
                  <td>

                    <a
                      href="${params.unsubscribeUrl}"
                      style="
                        background:#1e293b;
                        padding:12px 18px;
                        border-radius:999px;
                        color:#cbd5e1;
                        font-family:Arial;
                        font-weight:600;
                        text-decoration:none;
                        border:1px solid #334155;
                      "
                    >
                      Unsubscribe
                    </a>

                  </td>
                </tr>

              </table>

            </td>
          </tr>



        </table>

      </td>
    </tr>

  </table>

  </body>
  </html>
  `;



  const text = `New polls today

${pollsText}

Unsubscribe:
${params.unsubscribeUrl}`;


  return { html, text };
}



async function sendEmail(params:{
  to:string
  subject:string
  html:string
  text:string
}){

  const response = await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{
      Authorization:`Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      from:process.env.EMAIL_FROM,
      to:params.to,
      subject:params.subject,
      html:params.html,
      text:params.text
    })
  })

  if(!response.ok){
    throw new Error("email failed")
  }

}



export async function GET(request:NextRequest){

  const secret = request.nextUrl.searchParams.get("secret")

  if(secret !== process.env.DIGEST_SECRET){

    return NextResponse.json({error:"unauthorised"},{status:401})

  }


  const supabase = createClient(

    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!

  )


  const cutoff = new Date(Date.now()-24*60*60*1000).toISOString()



  const {data:polls} = await supabase
    .from("polls")
    .select("id,question,category,slug,created_at,poll_options")
    .gte("created_at",cutoff)
    .order("created_at",{ascending:false})


  const {data:subs} = await supabase
    .from("subscribers")
    .select("email,category_preferences")
    .eq("is_active",true)



  let sent = 0


  for(const sub of subs||[]){

    const matching =
      sub.category_preferences?.length
      ? polls?.filter(p=>sub.category_preferences.includes(p.category))
      : polls


    if(!matching?.length) continue


    const unsubscribeUrl = `${process.env.APP_BASE_URL}/api/unsubscribe?email=${encodeURIComponent(sub.email)}`


    const email = buildDigestEmail({

      polls:matching,
      appBaseUrl:process.env.APP_BASE_URL!,
      unsubscribeUrl

    })


    await sendEmail({

      to:sub.email,
      subject:"New polls today",
      html:email.html,
      text:email.text

    })


    sent++

  }



  return NextResponse.json({sent})

}