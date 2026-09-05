"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Row = {
  id: number; question: string; description: string | null; category: string | null;
  email: string | null; options: string[] | null; created_at: string | null; slug: string | null; embed_token: string | null;
};
const ADMIN_KEY_STORAGE = "pollandsee-admin-key";
export default function HiddenPage() {
 const [items,setItems]=useState<Row[]>([]); const [search,setSearch]=useState(""); const [loading,setLoading]=useState(true);
 useEffect(()=>{void (async()=>{const res=await fetch('/api/admin/hidden',{headers:{'x-admin-key':localStorage.getItem(ADMIN_KEY_STORAGE)||''}}); const data=await res.json(); setItems(data.items||[]); setLoading(false);})();},[]);
 const filtered=useMemo(()=>{const t=search.trim().toLowerCase(); return !t?items:items.filter(i=>[i.question,i.description||'',i.category||'',i.email||'',...(i.options||[])].join(' ').toLowerCase().includes(t));},[items,search]);
 return <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 px-6 py-8 text-white"><section className="mx-auto max-w-[1500px]">
 <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h1 className="text-3xl font-semibold">Hidden polls</h1><p className="mt-1 text-sm text-gray-300">Polls hidden from the homepage and submissions queue.</p></div><nav className="flex gap-2"><Link href="/admin/polls" className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm">Live Polls</Link><Link href="/admin/submissions" className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm">Submissions</Link><Link href="/admin/hidden" className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">Hidden</Link></nav></div>
 <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search hidden polls..." className="mb-4 h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm"/>
 <div className="space-y-3">{loading?<p>Loading hidden polls...</p>:filtered.map(item=><div key={item.id} className="rounded-2xl border border-gray-700 bg-gray-800 p-4"><div className="font-medium">{item.question}</div>{item.description?<div className="mt-1 text-sm text-gray-300">{item.description}</div>:null}<div className="mt-3"><label className="mb-1 block text-xs font-medium text-gray-400">Email</label><input value={item.email||''} readOnly placeholder="No email supplied" className="h-10 w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-white placeholder:text-gray-500"/></div><div className="mt-3 text-xs text-gray-400">Submission ID {item.id} · {item.category||'General'} · {item.created_at?new Date(item.created_at).toLocaleString():''}</div></div>)}</div>
 </section></main>;
}
