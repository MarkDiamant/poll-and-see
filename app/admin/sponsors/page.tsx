"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SIGNUP_CATEGORIES } from "@/lib/categories";

type SponsorRow = {
  id: number;
  business_name: string;
  headline: string;
  logo_url: string | null;
  cta_text: string;
  destination_url: string;
  category: string;
  start_at: string;
  end_at: string;
  is_active: boolean;
  created_at: string | null;
  theme: string | null;
};

const ADMIN_KEY_STORAGE = "pollandsee-admin-key";

const CATEGORY_OPTIONS = SIGNUP_CATEGORIES;

const THEME_OPTIONS = [
  "default",
  "slate",
  "navy",
  "charcoal",
  "green",
  "blue",
  "cream",
  "warm",
  "purple",
  "light",
  "softblue",
  "softgreen",
  "sand",
  "silver",
  "lavender",
  "sky",
];

const DEFAULT_FORM = {
  id: 0,
  business_name: "",
  headline: "",
  logo_url: "",
  cta_text: "Learn more",
  destination_url: "",
  categories: ["Community"],
  start_at: "",
  days: 1,
  end_at: "",
  is_active: true,
  theme: "default",
};

function getSponsorTheme(theme: string | null) {
  const themes: Record<string, { card: string; cta: string; label: string; accent: string }> = {
    default: {
      card: "border-amber-500/20 bg-[#0e0c08]",
      cta: "border-amber-300/20 bg-white/10 text-white hover:bg-white/15",
      label: "text-amber-300/70",
      accent: "from-amber-300/40 via-amber-400/20 to-transparent",
    },
    slate: {
      card: "border-slate-500/80 bg-slate-800",
      cta: "border-slate-400/25 bg-slate-700 text-slate-100 hover:bg-slate-600",
      label: "text-slate-300/70",
      accent: "from-slate-300/45 via-slate-400/25 to-transparent",
    },
    navy: {
      card: "border-blue-700/80 bg-[#0b1f38]",
      cta: "border-blue-300/25 bg-[#16304d] text-blue-100 hover:bg-[#1d3d61]",
      label: "text-blue-300/70",
      accent: "from-blue-300/45 via-blue-500/25 to-transparent",
    },
    charcoal: {
      card: "border-zinc-500/80 bg-zinc-800",
      cta: "border-zinc-400/25 bg-zinc-700 text-zinc-100 hover:bg-zinc-600",
      label: "text-zinc-300/70",
      accent: "from-zinc-300/45 via-zinc-500/25 to-transparent",
    },
    green: {
      card: "border-emerald-700/80 bg-[#0c241d]",
      cta: "border-emerald-300/25 bg-[#16382f] text-emerald-100 hover:bg-[#1f4a3f]",
      label: "text-emerald-300/70",
      accent: "from-emerald-300/45 via-emerald-500/25 to-transparent",
    },
    blue: {
      card: "border-sky-700/80 bg-[#0a2438]",
      cta: "border-sky-300/25 bg-[#16384d] text-sky-100 hover:bg-[#1e4a66]",
      label: "text-sky-300/70",
      accent: "from-sky-300/45 via-sky-500/25 to-transparent",
    },
    cream: {
      card: "border-amber-200/35 bg-amber-50/22 backdrop-blur-sm",
      cta: "border-amber-500/40 bg-amber-400/14 text-amber-50 hover:bg-amber-400/20",
      label: "text-amber-200/80",
      accent: "from-amber-200/45 via-amber-400/20 to-transparent",
    },
    warm: {
      card: "border-orange-300/30 bg-orange-300/14 backdrop-blur-sm",
      cta: "border-orange-400/45 bg-orange-400/12 text-orange-50 hover:bg-orange-400/18",
      label: "text-orange-200/80",
      accent: "from-orange-300/45 via-orange-500/20 to-transparent",
    },
    purple: {
      card: "border-purple-900/60 bg-[#160d24]",
      cta: "border-purple-300/20 bg-[#241633] text-purple-100 hover:bg-[#321f49]",
      label: "text-purple-300/70",
      accent: "from-purple-300/40 via-purple-500/20 to-transparent",
    },
    light: {
      card: "border-white/45 bg-white/32 backdrop-blur-sm",
      cta: "border-white/50 bg-white/18 text-white hover:bg-white/24",
      label: "text-white/80",
      accent: "from-white/55 via-white/25 to-transparent",
    },
    softblue: {
      card: "border-sky-300/30 bg-sky-400/14 backdrop-blur-sm",
      cta: "border-sky-300/45 bg-sky-400/12 text-sky-50 hover:bg-sky-400/18",
      label: "text-sky-200/80",
      accent: "from-sky-300/45 via-sky-500/20 to-transparent",
    },
    softgreen: {
      card: "border-emerald-300/30 bg-emerald-400/14 backdrop-blur-sm",
      cta: "border-emerald-300/45 bg-emerald-400/12 text-emerald-50 hover:bg-emerald-400/18",
      label: "text-emerald-200/80",
      accent: "from-emerald-300/45 via-emerald-500/20 to-transparent",
    },
    sand: {
      card: "border-stone-300/30 bg-stone-300/14 backdrop-blur-sm",
      cta: "border-stone-300/45 bg-stone-300/12 text-stone-50 hover:bg-stone-300/18",
      label: "text-stone-200/80",
      accent: "from-stone-300/45 via-stone-500/20 to-transparent",
    },
    silver: {
      card: "border-cyan-200/30 bg-cyan-300/12 backdrop-blur-sm",
      cta: "border-cyan-200/45 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/16",
      label: "text-cyan-100/80",
      accent: "from-cyan-200/45 via-cyan-400/20 to-transparent",
    },
    lavender: {
      card: "border-fuchsia-300/30 bg-fuchsia-400/14 backdrop-blur-sm",
      cta: "border-fuchsia-300/45 bg-fuchsia-400/12 text-fuchsia-50 hover:bg-fuchsia-400/18",
      label: "text-fuchsia-200/80",
      accent: "from-fuchsia-300/45 via-fuchsia-500/20 to-transparent",
    },
    sky: {
      card: "border-blue-300/30 bg-blue-400/14 backdrop-blur-sm",
      cta: "border-blue-300/45 bg-blue-400/12 text-blue-50 hover:bg-blue-400/18",
      label: "text-blue-200/80",
      accent: "from-blue-300/45 via-blue-500/20 to-transparent",
    },
  };

  const key = theme?.trim().toLowerCase() || "default";
  return themes[key] || themes.default;
}

function formatDateTimeLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function calculateEndAt(startAt: string, days: number) {
  if (!startAt) return "";
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + Math.max(days || 1, 1));
  return date.toISOString();
}

function getSponsorStatus(sponsor: SponsorRow) {
  if (!sponsor.is_active) return "Inactive";

  const now = Date.now();
  const start = new Date(sponsor.start_at).getTime();
  const end = new Date(sponsor.end_at).getTime();

  if (!Number.isNaN(end) && now >= end) return "Ended";
  if (!Number.isNaN(start) && now < start) return "Scheduled";
  return "Live now";
}

export default function AdminSponsorsPage() {
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const theme = getSponsorTheme(form.theme);

  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_KEY_STORAGE) || "";
    if (saved) {
      setAdminKey(saved);
      setAdminKeyInput(saved);
    }
  }, []);

  useEffect(() => {
    if (!adminKey) return;

    const loadSponsors = async () => {
      const response = await fetch("/api/admin/sponsors", {
        headers: { "x-admin-key": adminKey },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not load sponsors.");
        return;
      }

      setSponsors(data.sponsors || []);
    };

    void loadSponsors();

    const interval = window.setInterval(loadSponsors, 8000);
    return () => window.clearInterval(interval);
  }, [adminKey]);

  const selectedCategoryText = useMemo(() => form.categories.join(","), [form.categories]);

  const handleUnlock = () => {
    const trimmed = adminKeyInput.trim();
    if (!trimmed) return;
    sessionStorage.setItem(ADMIN_KEY_STORAGE, trimmed);
    setAdminKey(trimmed);
    setError("");
  };

  const toggleCategory = (category: string) => {
    setForm((current) => {
      const exists = current.categories.includes(category);
      const next = exists
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category];

      return {
        ...current,
        categories: next.length > 0 ? next : [category],
      };
    });
  };

  const editSponsor = (sponsor: SponsorRow) => {
    setForm({
      id: sponsor.id,
      business_name: sponsor.business_name || "",
      headline: sponsor.headline || "",
      logo_url: sponsor.logo_url || "",
      cta_text: sponsor.cta_text || "Learn more",
      destination_url: sponsor.destination_url || "",
      categories: String(sponsor.category || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      start_at: formatDateTimeLocal(sponsor.start_at),
      days: Math.max(
        1,
        Math.ceil(
          (new Date(sponsor.end_at).getTime() - new Date(sponsor.start_at).getTime()) /
            (24 * 60 * 60 * 1000)
        ) || 1
      ),
      end_at: formatDateTimeLocal(sponsor.end_at),
      is_active: Boolean(sponsor.is_active),
      theme: sponsor.theme || "default",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveSponsor = async () => {
    setSaving(true);
    setError("");

    try {
      const method = form.id ? "PATCH" : "POST";
      const response = await fetch("/api/admin/sponsors", {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          ...form,
          end_at: form.end_at || calculateEndAt(form.start_at, form.days),
          category: selectedCategoryText,
          categories: form.categories,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save sponsor.");
      }

      setSponsors((current) => {
        const existing = current.some((item) => item.id === data.sponsor.id);
        if (existing) {
          return current.map((item) => (item.id === data.sponsor.id ? data.sponsor : item));
        }

        return [data.sponsor, ...current];
      });

      setForm(DEFAULT_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save sponsor.");
    } finally {
      setSaving(false);
    }
  };

  if (!adminKey) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 px-6 py-10 text-white">
        <section className="mx-auto max-w-xl rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <Link href="/" aria-label="Go to homepage">
            <img src="/logo.png" alt="Poll & See" className="mb-5 block h-12 w-auto object-contain" />
          </Link>

          <h1 className="mb-2 text-2xl font-semibold">Admin</h1>
          <p className="mb-5 text-sm text-gray-300">Enter your admin key to manage sponsors.</p>

          <div className="space-y-3">
            <input
              type="password"
              value={adminKeyInput}
              onChange={(event) => setAdminKeyInput(event.target.value)}
              placeholder="Admin key"
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500"
            />

            <button
              type="button"
              onClick={handleUnlock}
              className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-gray-200"
            >
              Unlock
            </button>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 px-6 py-8 text-white">
      <section className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Go to homepage">
              <img src="/logo.png" alt="Poll & See" className="block h-12 w-auto object-contain" />
            </Link>

            <div>
              <h1 className="text-3xl font-semibold">Advertisers</h1>
              <p className="mt-1 text-sm text-gray-300">Create and manage sponsored advertiser cards.</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <Link href="/admin/polls" className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
              Live Polls
            </Link>
            <Link href="/admin/submissions" className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
              Submissions
            </Link>
            <Link href="/admin/hidden" className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
              Hidden
            </Link>
            <Link href="/admin/sponsors" className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">
              Advertisers
            </Link>
            <Link href="/admin/advertiser-enquiries" className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
              Enquiries
            </Link>
          </nav>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mb-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
            <h2 className="mb-4 text-xl font-semibold">{form.id ? "Edit sponsor" : "New sponsor"}</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none" placeholder="Business name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
              <input className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none" placeholder="Headline" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
              <input className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none" placeholder="Logo URL" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
              <input className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none" placeholder="Destination URL" value={form.destination_url} onChange={(e) => setForm({ ...form, destination_url: e.target.value })} />
              <input className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none" placeholder="CTA text" value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} />

              <select className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
                {THEME_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <input
                type="datetime-local"
                className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none"
                value={form.start_at}
                onChange={(e) => {
                  const nextStartAt = e.target.value;
                  setForm({
                    ...form,
                    start_at: nextStartAt,
                    end_at: calculateEndAt(nextStartAt, form.days),
                  });
                }}
              />

              <input
                type="number"
                min={1}
                className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none"
                value={form.days}
                onChange={(e) => {
                  const nextDays = Number(e.target.value);
                  setForm({
                    ...form,
                    days: nextDays,
                    end_at: calculateEndAt(form.start_at, nextDays),
                  });
                }}
                placeholder="Number of days"
              />
            </div>

            <div className="mt-3">
              <p className="mb-1 text-sm text-gray-300">End date/time</p>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none"
                value={form.end_at}
                onChange={(e) => setForm({ ...form, end_at: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">
                This auto-fills from start date + days, but you can override it manually.
              </p>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm text-gray-300">Categories</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                      form.categories.includes(category)
                        ? "bg-white text-black"
                        : "border border-gray-700 bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${
                  form.is_active ? "bg-white text-black" : "border border-gray-700 bg-gray-900 text-white"
                }`}
              >
                {form.is_active ? "Active" : "Inactive"}
              </button>

              <button type="button" onClick={saveSponsor} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60">
                {saving ? "Saving..." : form.id ? "Save sponsor" : "Create sponsor"}
              </button>

              {form.id ? (
                <button type="button" onClick={() => setForm(DEFAULT_FORM)} className="rounded-xl border border-gray-700 bg-gray-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
                  New sponsor
                </button>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
            <h2 className="mb-4 text-xl font-semibold">Live preview</h2>

            <a href={form.destination_url || "#"} className={`relative block overflow-hidden rounded-xl border p-4 transition ${theme.card}`}>
              <div className={`absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b ${theme.accent}`} />
              <div className="relative flex flex-col gap-3 pl-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 sm:pr-3">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-amber-300/70">Sponsored</p>
                  <p className="text-base font-semibold leading-snug text-white">{form.business_name || "Business name"}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-gray-100">{form.headline || "Sponsor headline goes here"}</p>
                </div>

                <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:justify-center sm:gap-2 sm:flex-shrink-0">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="" className="h-12 max-w-[170px] object-contain sm:h-14 sm:max-w-none" />
                  ) : null}

                  <button type="button" className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition ${theme.cta}`}>
                    {form.cta_text || "Learn more"}
                  </button>
                </div>
              </div>
            </a>

            <p className="mt-3 text-xs text-gray-400">
              Categories: {selectedCategoryText || "None"} · Theme: {form.theme}
            </p>
          </section>
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-left text-gray-300">
              <tr>
                <th className="px-4 py-3 font-medium">Sponsor</th>
                <th className="px-4 py-3 font-medium">Categories</th>
                <th className="px-4 py-3 font-medium">Theme</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sponsors.map((sponsor) => (
                <tr
  key={sponsor.id}
  onClick={() => editSponsor(sponsor)}
  className="cursor-pointer border-t border-gray-700 transition hover:bg-white/[0.03]"
>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{sponsor.business_name}</p>
                    <p className="text-xs text-gray-400">{sponsor.headline}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{sponsor.category}</td>
                  <td className="px-4 py-3 text-gray-300">{sponsor.theme || "default"}</td>
                  <td className="px-4 py-3 text-gray-300">{getSponsorStatus(sponsor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}