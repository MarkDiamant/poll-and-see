"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import LiveVoteCounter from "@/components/LiveVoteCounter";
import ActivityIndicator from "@/components/ActivityIndicator";
import { supabase } from "@/lib/supabase";
import { CATEGORY_OPTIONS, getCategoryColours } from "@/lib/categories";

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

const DAILY_PRICES: Record<number, number> = {
  1: 15,
  2: 28,
  3: 40,
  4: 50,
  5: 59,
  6: 67,
  7: 74,
  8: 80,
  9: 85,
  10: 89,
  11: 92,
  12: 94,
  13: 95,
};

function getDiscount(days: number) {
  if (days >= 30) return 0.2;
  if (days >= 7) return 0.15;
  if (days >= 3) return 0.1;
  return 0;
}

function getThemeLabel(theme: string) {
  if (theme === "softblue") return "Soft blue";
  if (theme === "softgreen") return "Soft green";
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}

function getAdvertTheme(theme: string) {
  const themes: Record<string, { card: string; cta: string; accent: string }> = {
    default: {
      card: "border-amber-500/20 bg-[#0e0c08]",
      cta: "border-amber-300/20 bg-white/10 text-white",
      accent: "from-amber-300/40 via-amber-400/20 to-transparent",
    },
    slate: {
      card: "border-slate-500/80 bg-slate-800",
      cta: "border-slate-400/25 bg-slate-700 text-slate-100",
      accent: "from-slate-300/45 via-slate-400/25 to-transparent",
    },
    navy: {
      card: "border-blue-700/80 bg-[#0b1f38]",
      cta: "border-blue-300/25 bg-[#16304d] text-blue-100",
      accent: "from-blue-300/45 via-blue-500/25 to-transparent",
    },
    charcoal: {
      card: "border-zinc-500/80 bg-zinc-800",
      cta: "border-zinc-400/25 bg-zinc-700 text-zinc-100",
      accent: "from-zinc-300/45 via-zinc-500/25 to-transparent",
    },
    green: {
      card: "border-emerald-700/80 bg-[#0c241d]",
      cta: "border-emerald-300/25 bg-[#16382f] text-emerald-100",
      accent: "from-emerald-300/45 via-emerald-500/25 to-transparent",
    },
    blue: {
      card: "border-sky-700/80 bg-[#0a2438]",
      cta: "border-sky-300/25 bg-[#16384d] text-sky-100",
      accent: "from-sky-300/45 via-sky-500/25 to-transparent",
    },
    cream: {
      card: "border-amber-200/35 bg-amber-50/22 backdrop-blur-sm",
      cta: "border-amber-500/40 bg-amber-400/14 text-amber-50",
      accent: "from-amber-200/45 via-amber-400/20 to-transparent",
    },
    warm: {
      card: "border-orange-300/30 bg-orange-300/14 backdrop-blur-sm",
      cta: "border-orange-400/45 bg-orange-400/12 text-orange-50",
      accent: "from-orange-300/45 via-orange-500/20 to-transparent",
    },
    purple: {
      card: "border-purple-900/60 bg-[#160d24]",
      cta: "border-purple-300/20 bg-[#241633] text-purple-100",
      accent: "from-purple-300/40 via-purple-500/20 to-transparent",
    },
    light: {
      card: "border-white/45 bg-white/32 backdrop-blur-sm",
      cta: "border-white/50 bg-white/18 text-white",
      accent: "from-white/55 via-white/25 to-transparent",
    },
    softblue: {
      card: "border-sky-300/30 bg-sky-400/14 backdrop-blur-sm",
      cta: "border-sky-300/45 bg-sky-400/12 text-sky-50",
      accent: "from-sky-300/45 via-sky-500/20 to-transparent",
    },
    softgreen: {
      card: "border-emerald-300/30 bg-emerald-400/14 backdrop-blur-sm",
      cta: "border-emerald-300/45 bg-emerald-400/12 text-emerald-50",
      accent: "from-emerald-300/45 via-emerald-500/20 to-transparent",
    },
    sand: {
      card: "border-stone-300/30 bg-stone-300/14 backdrop-blur-sm",
      cta: "border-stone-300/45 bg-stone-300/12 text-stone-50",
      accent: "from-stone-300/45 via-stone-500/20 to-transparent",
    },
    silver: {
      card: "border-cyan-200/30 bg-cyan-300/12 backdrop-blur-sm",
      cta: "border-cyan-200/45 bg-cyan-300/10 text-cyan-50",
      accent: "from-cyan-200/45 via-cyan-400/20 to-transparent",
    },
    lavender: {
      card: "border-fuchsia-300/30 bg-fuchsia-400/14 backdrop-blur-sm",
      cta: "border-fuchsia-300/45 bg-fuchsia-400/12 text-fuchsia-50",
      accent: "from-fuchsia-300/45 via-fuchsia-500/20 to-transparent",
    },
    sky: {
      card: "border-blue-300/30 bg-blue-400/14 backdrop-blur-sm",
      cta: "border-blue-300/45 bg-blue-400/12 text-blue-50",
      accent: "from-blue-300/45 via-blue-500/20 to-transparent",
    },
  };

  return themes[theme] || themes.default;
}

export default function AdvertisePage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [daysInput, setDaysInput] = useState("1");
  const [activeForm, setActiveForm] = useState<"booking" | "question">("booking");
  const [totalVoteCount, setTotalVoteCount] = useState<number | null>(null);
  const [votesLast24, setVotesLast24] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    businessName: "",
    email: "",
    phone: "",
    destination: "",
    preferredStartDate: "",
    adMessage: "",
    ctaText: "",
    logoUrl: "",
    theme: "default",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const days = Math.max(Number(daysInput) || 1, 1);
  const theme = getAdvertTheme(formData.theme);
  const allCategoryColours = getCategoryColours("All");

  const pricing = useMemo(() => {
    const categoryCount = selectedCategories.length;
    const cleanDays = Math.max(Number(daysInput) || 1, 1);

    if (categoryCount === 0) {
      return { categoryCount, dailyPrice: 0, days: cleanDays, categorySaving: 0, discount: 0, total: 0 };
    }

    const dailyPrice = DAILY_PRICES[Math.min(categoryCount, 13)] || 195;
    const categorySaving = categoryCount * DAILY_PRICES[1] - dailyPrice;
    const discount = getDiscount(cleanDays);
    const subtotal = dailyPrice * cleanDays;
    const total = Math.round(subtotal * (1 - discount));

    return { categoryCount, dailyPrice, days: cleanDays, categorySaving, discount, total };
  }, [selectedCategories, daysInput]);

  useEffect(() => {
    const loadVoteStats = async () => {
      try {
        const [{ data: statsRow }, { data: recentVotes }] = await Promise.all([
          supabase.from("site_stats").select("total_votes").eq("key", "global").single(),
          supabase.rpc("get_recent_poll_votes"),
        ]);

        setTotalVoteCount(statsRow?.total_votes ?? 0);

        const recentTotal = (recentVotes || []).reduce(
          (sum: number, row: { recent_votes_24h: number | string | null }) =>
            sum + Number(row.recent_votes_24h || 0),
          0
        );

        setVotesLast24(recentTotal);
      } catch {
        // ignore
      }
    };

    void loadVoteStats();

    const interval = window.setInterval(() => {
      void loadVoteStats();
    }, 25000);

    return () => window.clearInterval(interval);
  }, []);

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  };

  const toggleAllCategories = () => {
    setSelectedCategories((current) =>
      current.length === CATEGORY_OPTIONS.length ? [] : [...CATEGORY_OPTIONS]
    );
  };

  const updateField = (key: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const increaseDays = () => {
    setDaysInput((current) => String(Math.max(Number(current) || 1, 1) + 1));
  };

  const decreaseDays = () => {
    setDaysInput((current) => String(Math.max((Number(current) || 1) - 1, 1)));
  };

  const openDatePicker = (input: HTMLInputElement) => {
    input.showPicker?.();
  };

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setError("");

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const response = await fetch("/api/advertise-logo-upload", {
        method: "POST",
        body: uploadData,
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Could not upload logo.");

      updateField("logoUrl", data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload logo.");
    } finally {
      setLogoUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError("");
    setStatusMessage("");

    if (activeForm === "booking") {
      if (selectedCategories.length === 0) {
        setError("Choose at least one advertising category.");
        setSending(false);
        return;
      }

      if (
        !formData.businessName.trim() ||
        !formData.destination.trim() ||
        !formData.adMessage.trim() ||
        !formData.ctaText.trim() ||
        !formData.logoUrl.trim() ||
        !formData.preferredStartDate.trim() ||
        !formData.name.trim() ||
        !formData.email.trim() ||
        !formData.phone.trim()
      ) {
        setError("Please complete the ad and contact details before submitting.");
        setSending(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/advertise-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          headline: formData.adMessage,
          enquiryType: activeForm,
          categories: activeForm === "booking" ? selectedCategories : [],
          days: activeForm === "booking" ? days : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Could not send enquiry.");

      setStatusMessage(
        activeForm === "booking"
          ? "Thanks. Your advertising request has been sent."
          : "Thanks. Your question has been sent."
      );

      setFormData({
        name: "",
        businessName: "",
        email: "",
        phone: "",
        destination: "",
        preferredStartDate: "",
        adMessage: "",
        ctaText: "",
        logoUrl: "",
        theme: "default",
        message: "",
      });
      setSelectedCategories([]);
      setDaysInput("1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send enquiry.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <SiteHeader />

      <section className="mx-auto max-w-5xl px-6 pb-12 pt-3">

        <div className="mx-auto mb-8 max-w-3xl text-center">
          <h1 className="mb-3 text-4xl font-bold md:text-5xl">
            <span className="block md:inline">Advertise with</span>{" "}
            <span className="block md:inline">Poll & See</span>
          </h1>
          <p className="text-lg text-gray-300">
            Get your business shown repeatedly inside selected poll categories, just after people vote.
          </p>
          {totalVoteCount !== null && <LiveVoteCounter value={totalVoteCount} />}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
              <h2 className="mb-3 text-2xl font-semibold">How it works</h2>
              <div className="space-y-3 text-sm leading-6 text-gray-300">
                <p>
                  Choose the categories where you want your ad to appear, then choose how many days it should run. After that, create your ad with your business name, message, button text, logo and link.
                </p>
                <p>
  We’ll confirm availability for your selected categories and dates, then send an invoice. Once paid, your ad can go live.
</p>
<p>
  Poll & See has already recorded over {(Math.floor((totalVoteCount || 0) / 1000) * 1000).toLocaleString()} votes and is growing fast week on week. Businesses can dramatically increase the reach of their campaign by creating and sharing polls with staff, customers, WhatsApp groups, social media and email lists, generating additional votes, engagement and advert views.
</p>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
              <h2 className="mb-4 text-2xl font-semibold">Pricing calculator</h2>

              <div className="mb-5 grid gap-3 rounded-2xl border border-gray-700 bg-gray-900 p-4 text-sm text-gray-300 md:grid-cols-2">
                <div>
                  <p className="mb-2 font-medium text-white">Category pricing guide</p>
<p>1: £15/day</p>
<p>2: £28/day</p>
<p>3: £40/day</p>
<p>4+: lower rate per extra category</p>
<p>13 categories: £95/day</p>
                </div>

                <div>
                  <p className="mb-2 font-medium text-white">Duration discount</p>
                  <p>3+ days: 10% off</p>
                  <p>7+ days: 15% off</p>
                  <p>30+ days: 20% off</p>
                  <p>90+ days: get in touch</p>
                </div>
              </div>

              <p className="mb-2 text-sm font-medium text-gray-300">
                Choose where your ad should appear and how many days it should run to see the price.
              </p>

              <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={toggleAllCategories}
                  style={
                    selectedCategories.length === CATEGORY_OPTIONS.length
                      ? {
                          color: allCategoryColours.text,
                          backgroundColor: allCategoryColours.bg,
                          borderColor: allCategoryColours.border,
                        }
                      : undefined
                  }
                  className={`h-10 cursor-pointer rounded-xl border px-3 text-sm font-medium transition ${
                    selectedCategories.length === CATEGORY_OPTIONS.length
                      ? ""
                      : "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  All categories
                </button>

                {CATEGORY_OPTIONS.map((category) => {
                  const active = selectedCategories.includes(category);
                  const categoryColours = getCategoryColours(category);

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
style={{
  color: active ? "#ffffff" : categoryColours.text,
  backgroundColor: active ? categoryColours.solid : "rgba(17, 24, 39, 0.9)",
  borderColor: active ? categoryColours.solid : categoryColours.border,
}}
className="h-10 cursor-pointer rounded-xl border px-3 text-sm font-medium transition hover:opacity-90"
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              <label className="mb-2 block text-sm font-medium text-gray-300">Number of days</label>
              <div className="relative mb-5">
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={daysInput}
                  onChange={(event) => setDaysInput(event.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 pr-12 text-sm text-white outline-none [appearance:textfield] [color-scheme:dark] focus:border-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />

                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-md border border-gray-600 bg-gray-800">
                  <button
                    type="button"
                    onClick={increaseDays}
                    className="flex h-4.5 w-6 items-center justify-center text-[10px] leading-none text-gray-200 transition hover:bg-gray-700"
                  >
                    +
                  </button>

                  <button
                    type="button"
                    onClick={decreaseDays}
                    className="flex h-4.5 w-6 items-center justify-center border-t border-gray-600 text-[10px] leading-none text-gray-200 transition hover:bg-gray-700"
                  >
                    −
                  </button>
                </div>
              </div>

              {pricing.categoryCount > 0 ? (
  <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
                  <div className="grid gap-2 text-sm text-gray-300">
                    <div className="flex justify-between gap-4">
                      <span>Selected categories</span>
                      <span className="font-medium text-white">{pricing.categoryCount}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Multi-category price</span>
                      <span className="font-medium text-white">£{pricing.dailyPrice}/day</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Multi-category saving</span>
                      <span className="font-medium text-white">£{pricing.categorySaving}/day</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Days</span>
                      <span className="font-medium text-white">{pricing.days}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Duration discount</span>
                      <span className="font-medium text-white">{Math.round(pricing.discount * 100)}%</span>
                    </div>
                    <div className="mt-3 flex justify-between border-t border-gray-700 pt-3 text-base">
                      <span>Total price</span>
                      <span className="font-semibold text-white">£{pricing.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
) : null}
            </section>
          </div>

          <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5 lg:sticky lg:top-6 lg:self-start">
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveForm("booking")}
                className={`h-10 rounded-xl text-sm font-medium transition ${
                  activeForm === "booking"
                    ? "bg-white text-black"
                    : "border border-gray-700 bg-gray-900 text-white hover:bg-gray-800"
                }`}
              >
                Create your ad
              </button>

              <button
                type="button"
                onClick={() => setActiveForm("question")}
                className={`h-10 rounded-xl text-sm font-medium transition ${
                  activeForm === "question"
                    ? "bg-white text-black"
                    : "border border-gray-700 bg-gray-900 text-white hover:bg-gray-800"
                }`}
              >
                Ask a question
              </button>
            </div>

            <h2 className="mb-2 text-2xl font-semibold">
              {activeForm === "booking" ? "Create your ad" : "Ask a question"}
            </h2>

            {activeForm === "booking" ? (
              <p className="mb-4 text-sm text-gray-300">
                Fill in the details below to see what your ad will look like.
              </p>
            ) : null}

            {activeForm === "booking" ? (
              <div className={`relative -mx-5 mb-4 block overflow-hidden rounded-xl border p-4 transition sm:mx-0 ${theme.card}`}>
                <div className={`absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b ${theme.accent}`} />

                <div className="relative space-y-3 pl-2">
                  <div>
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-amber-300/70">Sponsored</p>
                    <p className="text-base font-semibold leading-snug text-white">
                      {formData.businessName || "Your Business"}
                    </p>
                    <p className="mt-1 text-[15px] leading-relaxed text-gray-100">
                      {formData.adMessage || "Your ad message shown repeatedly in selected categories."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="" className="h-12 max-w-[170px] object-contain" />
                    ) : (
                      <div className="flex h-12 w-28 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-xs font-semibold text-white">
                        Logo
                      </div>
                    )}

<span className={`flex min-h-[56px] max-w-[145px] items-center justify-center rounded-lg border px-4 py-2.5 text-center text-sm font-medium leading-tight ${theme.cta}`}>
  {formData.ctaText || "Learn more"}
</span>
                  </div>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-3">
              {activeForm === "booking" ? (
                <>
                  <input
                    value={formData.businessName}
                    onChange={(event) => updateField("businessName", event.target.value)}
                    placeholder="Business name shown as the ad heading"
required
maxLength={30}
                    className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
                  />

                  <input
                    value={formData.adMessage}
                    onChange={(event) => updateField("adMessage", event.target.value)}
                    placeholder="Ad message shown under your business name"
                    required
maxLength={75}
                    className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
                  />

                  <input
                    value={formData.ctaText}
                    onChange={(event) => updateField("ctaText", event.target.value)}
                    placeholder="Button text, e.g. Learn more"
                    required
maxLength={20}
                    className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
                  />

                  <input
                    value={formData.destination}
                    onChange={(event) => updateField("destination", event.target.value)}
                    placeholder="Button link, e.g. website or socials"
                    required
                    className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
                  />

                  <div>
                    <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-800">
                      {logoUploading ? "Uploading logo..." : formData.logoUrl ? "Logo uploaded" : "Upload logo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoUpload}
                        disabled={logoUploading}
                        required={!formData.logoUrl}
                        className="hidden"
                      />
                    </label>

                    {formData.logoUrl ? (
                      <a href={formData.logoUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-blue-300 hover:text-blue-200">
                        View uploaded logo
                      </a>
                    ) : null}

                    <p className="mt-1 text-xs text-gray-500">PNG or SVG with a transparent background works best.</p>
                  </div>

<div className="relative">
  <select
    value={formData.theme}
    onChange={(event) => updateField("theme", event.target.value)}
    className="h-11 w-full appearance-none rounded-xl border border-gray-700 bg-gray-900 px-4 pr-12 text-sm text-white outline-none focus:border-gray-500"
  >
    <option value="default">Choose colour theme: Default</option>
    {[...THEME_OPTIONS]
      .filter((themeOption) => themeOption !== "default")
      .sort((a, b) => getThemeLabel(a).localeCompare(getThemeLabel(b)))
      .map((themeOption) => (
        <option key={themeOption} value={themeOption}>
          {getThemeLabel(themeOption)}
        </option>
      ))}
  </select>
  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
    ▾
  </span>
</div>

<div>
  <p className="mb-1 text-xs text-gray-400">Ad start date</p>
  <div className="relative">
    <input
      type="date"
      value={formData.preferredStartDate}
      onChange={(event) => updateField("preferredStartDate", event.target.value)}
      onClick={(event) => openDatePicker(event.currentTarget)}
      required
      className="h-11 w-full cursor-pointer rounded-xl border border-gray-700 bg-gray-900 px-4 pr-12 text-sm text-white outline-none opacity-0"
    />

    <button
      type="button"
      onClick={(event) => {
        const input = event.currentTarget.previousElementSibling as HTMLInputElement | null;
        if (input) openDatePicker(input);
      }}
      className="absolute inset-0 flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-gray-700 bg-gray-900 px-4 text-left text-sm text-white outline-none [color-scheme:dark] focus:border-gray-500"
    >
      <span className={formData.preferredStartDate ? "text-white" : "text-gray-500"}>
        {formData.preferredStartDate || "dd/mm/yyyy"}
      </span>
      <span className="text-base text-white">📅</span>
    </button>
  </div>
</div>

<div>
  <p className="mb-1 text-xs text-gray-400">Number of days the ad should run</p>
  <div className="relative">
    <input
      type="number"
      min={1}
      inputMode="numeric"
      value={daysInput}
      onChange={(event) => setDaysInput(event.target.value)}
      required
      className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 pr-12 text-sm text-white outline-none [appearance:textfield] [color-scheme:dark] focus:border-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />

    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-md border border-gray-600 bg-gray-800">
      <button
        type="button"
        onClick={increaseDays}
        className="flex h-4.5 w-6 items-center justify-center text-[10px] leading-none text-gray-200 transition hover:bg-gray-700"
      >
        +
      </button>

      <button
        type="button"
        onClick={decreaseDays}
        className="flex h-4.5 w-6 items-center justify-center border-t border-gray-600 text-[10px] leading-none text-gray-200 transition hover:bg-gray-700"
      >
        −
      </button>
    </div>
  </div>
</div>

                  <textarea
                    value={formData.message}
                    onChange={(event) => updateField("message", event.target.value)}
                    placeholder="Anything else you would like us to know?"
                    rows={3}
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none focus:border-gray-500"
                  />

                  <div className="border-t border-gray-700 pt-4">
                    <p className="mb-3 text-sm font-semibold text-white">Your details</p>

                    <div className="space-y-3">
                      <input
                        value={formData.name}
                        onChange={(event) => updateField("name", event.target.value)}
                        placeholder="Name"
                        required
                        className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
                      />

                      <input
                        type="email"
                        value={formData.email}
                        onChange={(event) => updateField("email", event.target.value)}
                        placeholder="Email"
                        required
                        className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
                      />

                      <input
                        value={formData.phone}
                        onChange={(event) => updateField("phone", event.target.value)}
                        placeholder="Phone / WhatsApp"
                        required
                        className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <input
                    value={formData.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Name"
                    required
                    className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
                  />

                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="Email"
                    required
                    className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
                  />

                  <input
                    value={formData.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="Phone / WhatsApp"
                    className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
                  />

                  <textarea
                    value={formData.message}
                    onChange={(event) => updateField("message", event.target.value)}
                    placeholder="Your question"
                    rows={4}
                    required
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none focus:border-gray-500"
                  />
                </>
              )}

              <button type="submit" disabled={sending || logoUploading} className="h-11 w-full cursor-pointer rounded-xl bg-white px-4 text-sm font-medium text-black transition hover:bg-gray-200 disabled:opacity-60">
                {sending ? "Sending..." : activeForm === "booking" ? "Send advertising request" : "Send question"}
              </button>
            </form>

            {statusMessage ? <p className="mt-3 text-sm text-green-300">{statusMessage}</p> : null}
            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </section>
        </div>
      </section>

      <Footer />
      <ActivityIndicator votesLast24={votesLast24} />
    </main>
  );
}