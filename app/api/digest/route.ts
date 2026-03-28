// FULL FILE
// (trimmed explanation comments removed for brevity)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PollRow = {
  id:number
  question:string
  description:string
  category:string
  slug:string
  created_at:string
}

type PollOptionRow = {
  id:number
  poll_id:number
  option_text:string
}

type SubscriberRow = {
  email:string
  category_preferences:string[]|null
}

type PollWithOptions = PollRow & {
  options:string[]
}

const CATEGORY_COLOURS={
 Business:{text:"#93c5fd",bg:"rgba(37,99,235,.12)",border:"rgba(37,99,235,.55)"},
 Community:{text:"#fca5a5",bg:"rgba(239,68,68,.12)",border:"rgba(239,68,68,.55)"},
 Education:{text:"#fde68a",bg:"rgba(245,158,11,.12)",border:"rgba(245,158,11,.55)"},
 Finance:{text:"#86efac",bg:"rgba(34,197,94,.12)",border:"rgba(34,197,94,.55)"},
 Fun:{text:"#f9a8d4",bg:"rgba(236,72,153,.12)",border:"rgba(236,72,153,.55)"},
 General:{text:"#67e8f9",bg:"rgba(6,182,212,.12)",border:"rgba(6,182,212,.55)"},
 Lifestyle:{text:"#d8b4fe",bg:"rgba(168,85,247,.12)",border:"rgba(168,85,247,.55)"}
}

function esc(v:string){
 return v.replace(/&/g,"&amp;")
 .replace(/</g,"&lt;")
 .replace(/>/g,"&gt;")
}

function lookbackHours(){
 const d=new Date().getUTCDay()
 return d===0?48:24
}

function emailHtml(polls:PollWithOptions[],base:string,unsub:string){

 const logo=`${base}/logo.png`

 const blocks=polls.map(p=>{

 const url=`${base}/poll/${p.slug}`
 const c=CATEGORY_COLOURS[p.category as keyof typeof CATEGORY_COLOURS]

 const opts=p.options.slice(0,4).map(o=>`

 <tr>
 <td style="padding:0 0 10px 0">
 <a href="${url}"
 style="
 display:block;
 background:#374151;
 border-radius:16px;
 padding:14px;
 text-align:center;
 color:#fff;
 text-decoration:none;
 font-size:15px;
 font-family:Arial;
 ">
 ${esc(o)}
 </a>
 </td>
 </tr>

 `).join("")

 return`

 <tr>
 <td style="padding:0 0 18px 0">

 <table width="100%" style="
 background:#1f2937;
 border:1px solid #374151;
 border-radius:22px;
 ">

 <tr>
 <td style="padding:20px">

 <div style="
 display:inline-block;
 padding:6px 12px;
 font-size:12px;
 border-radius:999px;
 color:${c.text};
 background:${c.bg};
 border:1px solid ${c.border};
 margin-bottom:12px;
 ">
 ${esc(p.category)}
 </div>

 <div style="
 font-size:20px;
 font-weight:700;
 color:#fff;
 margin-bottom:10px;
 font-family:Arial;
 ">
 ${esc(p.question)}
 </div>

 <div style="
 font-size:15px;
 color:#d1d5db;
 margin-bottom:14px;
 font-family:Arial;
 ">
 ${esc(p.description||"")}
 </div>

 <table width="100%">
 ${opts}
 </table>

 </td>
 </tr>

 </table>

 </td>
 </tr>

 `

 }).join("")

 return`

 <html>

 <body style="
 margin:0;
 background:linear-gradient(#000,#111827);
 padding:30px 14px;
 ">

 <table align="center" width="640">

 <tr>

 <td align="center" style="padding-bottom:20px">

 <a href="${base}">
 <img src="${logo}" width="180">
 </a>

 </td>

 </tr>

 ${blocks}

 <tr>

 <td align="center" style="
 padding:22px;
 background:#111827;
 border-radius:22px;
 border:1px solid #1f2937;
 ">

 <a href="${unsub}"
 style="
 display:inline-block;
 padding:12px 18px;
 border-radius:999px;
 background:#1f2937;
 border:1px solid #374151;
 color:#e5e7eb;
 text-decoration:none;
 font-family:Arial;
 ">
 Unsubscribe
 </a>

 </td>

 </tr>

 </table>

 </body>

 </html>

 `
}

async function sendMail(to:string,html:string){

 await fetch("https://api.resend.com/emails",{
 method:"POST",
 headers:{
 Authorization:`Bearer ${process.env.RESEND_API_KEY}`,
 "Content-Type":"application/json"
 },
 body:JSON.stringify({
 from:process.env.EMAIL_FROM,
 to,
 subject:"New polls today",
 html
 })
 })

}

export async function GET(req:NextRequest){

 if(req.nextUrl.searchParams.get("secret")!==process.env.DIGEST_SECRET)
 return NextResponse.json({error:"no"})

 const supabase=createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
 process.env.SUPABASE_SERVICE_ROLE_KEY!
 )

 const cutoff=new Date(
 Date.now()-lookbackHours()*60*60*1000
 ).toISOString()

 const {data:polls}=await supabase
 .from("polls")
 .select("id,question,description,category,slug,created_at")
 .gte("created_at",cutoff)

 const {data:subs}=await supabase
 .from("subscribers")
 .select("email,category_preferences")
 .eq("is_active",true)

 if(!polls?.length||!subs?.length)
 return NextResponse.json({sent:0})

 const ids=polls.map(p=>p.id)

 const {data:opts}=await supabase
 .from("poll_options")
 .select("poll_id,option_text")
 .in("poll_id",ids)

 const map=new Map<number,string[]>()

 opts?.forEach(o=>{
 map.set(o.poll_id,[...(map.get(o.poll_id)||[]),o.option_text])
 })

 const pollsWithOptions=polls.map(p=>({
 ...p,
 options:map.get(p.id)||[]
 }))

 let sent=0

 for(const s of subs){

 const match=s.category_preferences?.length
 ?pollsWithOptions.filter(p=>s.category_preferences?.includes(p.category))
 :pollsWithOptions

 if(!match.length) continue

 const html=emailHtml(
 match,
 process.env.APP_BASE_URL!,
 `${process.env.APP_BASE_URL}/api/unsubscribe?email=${encodeURIComponent(s.email)}`
 )

 await sendMail(s.email,html)

 sent++

 }

 return NextResponse.json({sent})

}