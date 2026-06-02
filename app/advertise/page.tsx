"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";

const CATEGORIES = [
  "Business",
  "Community",
  "Education",
  "Finance",
  "Fun",
  "General",
  "Lifestyle",
  "Politics",
  "Sports",
];

const DAILY_PRICES: Record<number, number> = {
  1: 25,
  2: 45,
  3: 65,
  4: 85,
  5: 100,
  6: 115,
  7: 130,
  8: 140,
  9: 150,
};

function getDiscount(days: number) {
  if (days >= 30) return 0.2;
  if (days >= 7) return 0.15;
  if (days >= 3) return 0.1;
  return 0;
}

export default function AdvertisePage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [daysInput, setDaysInput] = useState("1");
  const [activeForm, setActiveForm] = useState<"booking" | "question">("booking");
  const [formData, setFormData] = useState({
    name: "",
    businessName: "",
    email: "",
    phone: "",
    destination: "",
    preferredStartDate: "",
    headline: "",
    ctaText: "Learn more",
    logoUrl: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const days = Math.max(Number(daysInput) || 1, 1);

  const pricing = useMemo(() => {
    const categoryCount = selectedCategories.length;
    const cleanDays = Math.max(Number(daysInput) || 1, 1);

    if (categoryCount === 0) {
      return {
        categoryCount,
        dailyPrice: 0,
        days: cleanDays,
        categorySaving: 0,
        discount: 0,
        total: 0,
      };
    }

    const dailyPrice = DAILY_PRICES[Math.min(categoryCount, 9)] || 150;
    const categorySaving = categoryCount * DAILY_PRICES[1] - dailyPrice;
    const discount = getDiscount(cleanDays);
    const subtotal = dailyPrice * cleanDays;
    const total = Math.round(subtotal * (1 - discount));

    return {
      categoryCount,
      dailyPrice,
      days: cleanDays,
      categorySaving,
      discount,
      total,
    };
  }, [selectedCategories, daysInput]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) => {
      if (current.includes(category)) {
        return current.filter((item) => item !== category);
      }

      return [...current, category];
    });
  };

  const toggleAllCategories = () => {
    setSelectedCategories((current) =>
      current.length === CATEGORIES.length ? [] : [...CATEGORIES]
    );
  };

  const updateField = (key: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [key]: value }));
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

      if (!response.ok) {
        throw new Error(data.error || "Could not upload logo.");
      }

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

    try {
      const response = await fetch("/api/advertise-enquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          enquiryType: activeForm,
          categories: activeForm === "booking" ? selectedCategories : [],
          days: activeForm === "booking" ? days : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not send enquiry.");
      }

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
        headline: "",
        ctaText: "Learn more",
        logoUrl: "",
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

      <section className="mx-auto max-w-5xl px-6 pb-12 pt-6">
        <Link href="/" className="mb-5 inline-flex text-sm font-medium text-gray-400 hover:text-white">
          ‹ Back to Poll & See
        </Link>

        <div className="mb-8 max-w-3xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">
            Poll & See advertising
          </p>
          <h1 className="mb-3 text-4xl font-bold md:text-5xl">
            Advertise with Poll & See
          </h1>
          <p className="text-lg text-gray-300">
            Put your business in front of active voters with clean, category-based ads inside the poll flow.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
              <h2 className="mb-3 text-2xl font-semibold">How it works</h2>
              <div className="space-y-3 text-sm leading-6 text-gray-300">
                <p>Ads appear after users vote, so your business is shown when people are already engaged.</p>
                <p>After you submit an advertising request, we confirm availability, ask for any clarifications, and send an invoice. Once paid, your ad can go live.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
              <h2 className="mb-4 text-2xl font-semibold">Example ad</h2>

              <div className="relative block overflow-hidden rounded-xl border border-sky-700/80 bg-[#0a2438] p-4">
                <div className="absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-sky-300/45 via-sky-500/25 to-transparent" />
                <div className="relative flex flex-col gap-3 pl-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 sm:pr-3">
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-amber-300/70">
                      Sponsored
                    </p>
                    <p className="text-base font-semibold leading-snug text-white">
                      Your Business
                    </p>
                    <p className="mt-1 text-[15px] leading-relaxed text-gray-100">
                      A short, clean advert headline shown inside the poll flow.
                    </p>
                  </div>

                  <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:justify-center sm:gap-2 sm:flex-shrink-0">
                    <div className="flex h-12 w-16 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-xs font-semibold text-white sm:h-14">
                      Logo
                    </div>

                    <span className="rounded-lg border border-sky-300/25 bg-[#16384d] px-4 py-2.5 text-sm font-medium text-sky-100">
                      Learn more
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
              <h2 className="mb-4 text-2xl font-semibold">Pricing calculator</h2>

              <div className="mb-5 grid gap-3 rounded-2xl border border-gray-700 bg-gray-900 p-4 text-sm text-gray-300 md:grid-cols-2">
                <div>
                  <p className="mb-2 font-medium text-white">Category pricing guide</p>
                  <p>1 category: £25/day</p>
                  <p>2 categories: £45/day</p>
                  <p>3 categories: £65/day</p>
                  <p>4 categories: £85/day</p>
                  <p>5+ categories: lower rate per extra category</p>
                </div>

                <div>
                  <p className="mb-2 font-medium text-white">Duration discount</p>
                  <p>3+ days: 10% off</p>
                  <p>7+ days: 15% off</p>
                  <p>30+ days: 20% off</p>
                </div>
              </div>

              {selectedCategories.length === 0 ? (
                <p className="mb-3 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-300">
                  Choose at least one category to see pricing.
                </p>
              ) : null}

              <p className="mb-2 text-sm font-medium text-gray-300">Choose advertising categories</p>
              <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={toggleAllCategories}
                  className={`h-10 cursor-pointer rounded-xl border px-3 text-sm font-medium transition ${
                    selectedCategories.length === CATEGORIES.length
                      ? "border-white bg-white text-black"
                      : "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  All categories
                </button>

                {CATEGORIES.map((category) => {
                  const active = selectedCategories.includes(category);

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`h-10 cursor-pointer rounded-xl border px-3 text-sm font-medium transition ${
                        active
                          ? "border-white bg-white text-black"
                          : "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              <label className="mb-2 block text-sm font-medium text-gray-300">
                Number of days
              </label>
              <input
                type="number"
                min={1}
                value={daysInput}
                onChange={(event) => setDaysInput(event.target.value)}
                className="mb-5 h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
              />

              <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
                {pricing.categoryCount === 0 ? (
                  <p className="text-sm text-gray-300">Select categories above to calculate the price.</p>
                ) : (
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
                      <span className="font-medium text-white">
                        {Math.round(pricing.discount * 100)}%
                      </span>
                    </div>
                    <div className="mt-3 flex justify-between border-t border-gray-700 pt-3 text-base">
                      <span>Total price</span>
                      <span className="font-semibold text-white">£{pricing.total.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
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
                Book advertising
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

            <h2 className="mb-4 text-2xl font-semibold">
              {activeForm === "booking" ? "Book advertising" : "Ask a question"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                value={formData.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Name"
                required
                className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
              />

              {activeForm === "booking" ? (
                <input
                  value={formData.businessName}
                  onChange={(event) => updateField("businessName", event.target.value)}
                  placeholder="Business name"
                  required
                  className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
                />
              ) : null}

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

              {activeForm === "booking" ? (
                <>
                  <input
                    value={formData.destination}
                    onChange={(event) => updateField("destination", event.target.value)}
                    placeholder="Website, WhatsApp, Instagram or Facebook link"
                    className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
                  />

                  <input
                    type="date"
                    value={formData.preferredStartDate}
                    onChange={(event) => updateField("preferredStartDate", event.target.value)}
                    className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
                  />

                  <input
                    type="number"
                    min={1}
                    value={daysInput}
                    onChange={(event) => setDaysInput(event.target.value)}
                    placeholder="Number of days"
                    className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
                  />

                  <input
                    value={formData.headline}
                    onChange={(event) => updateField("headline", event.target.value)}
                    placeholder="Advert headline"
                    className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
                  />

                  <input
                    value={formData.ctaText}
                    onChange={(event) => updateField("ctaText", event.target.value)}
                    placeholder="Button text"
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
                        className="hidden"
                      />
                    </label>

                    {formData.logoUrl ? (
                      <a
                        href={formData.logoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block text-xs text-blue-300 hover:text-blue-200"
                      >
                        View uploaded logo
                      </a>
                    ) : null}

                    <p className="mt-1 text-xs text-gray-500">
                      PNG or SVG with a transparent background works best. JPG and WEBP are also accepted.
                    </p>
                  </div>
                </>
              ) : null}

              <textarea
                value={formData.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder={activeForm === "booking" ? "Anything else we should know?" : "Your question"}
                rows={4}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none focus:border-gray-500"
              />

              <button
                type="submit"
                disabled={sending || logoUploading}
                className="h-11 w-full cursor-pointer rounded-xl bg-white px-4 text-sm font-medium text-black transition hover:bg-gray-200 disabled:opacity-60"
              >
                {sending ? "Sending..." : activeForm === "booking" ? "Send advertising request" : "Send question"}
              </button>
            </form>

            {statusMessage ? (
              <p className="mt-3 text-sm text-green-300">{statusMessage}</p>
            ) : null}

            {error ? (
              <p className="mt-3 text-sm text-red-300">{error}</p>
            ) : null}
          </section>
        </div>
      </section>

      <Footer />
    </main>
  );
}