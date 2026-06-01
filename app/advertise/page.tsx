"use client";

import { useMemo, useState, type FormEvent } from "react";
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Community"]);
  const [days, setDays] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    businessName: "",
    email: "",
    phone: "",
    destination: "",
    preferredStartDate: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const pricing = useMemo(() => {
    const categoryCount = Math.max(selectedCategories.length, 1);
    const cleanDays = Math.max(days || 1, 1);
    const dailyPrice = DAILY_PRICES[Math.min(categoryCount, 9)] || 150;
    const discount = getDiscount(cleanDays);
    const subtotal = dailyPrice * cleanDays;
    const total = Math.round(subtotal * (1 - discount));

    return {
      categoryCount,
      dailyPrice,
      days: cleanDays,
      discount,
      total,
    };
  }, [selectedCategories, days]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) => {
      if (current.includes(category)) {
        const next = current.filter((item) => item !== category);
        return next.length > 0 ? next : current;
      }

      return [...current, category];
    });
  };

  const updateField = (key: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [key]: value }));
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
          categories: selectedCategories,
          days,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not send enquiry.");
      }

      setStatusMessage("Thanks. Your enquiry has been sent.");
      setFormData({
        name: "",
        businessName: "",
        email: "",
        phone: "",
        destination: "",
        preferredStartDate: "",
        message: "",
      });
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
            Advertise
          </p>
          <h1 className="mb-3 text-4xl font-bold md:text-5xl">
            Sponsor Poll & See
          </h1>
          <p className="text-lg text-gray-300">
            Put your business in front of active voters with clean, category-based sponsor cards inside the poll flow.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
              <h2 className="mb-3 text-2xl font-semibold">How sponsorship works</h2>
              <div className="space-y-3 text-sm leading-6 text-gray-300">
                <p>Sponsors appear on poll voting/result pages after a user has voted and results are shown.</p>
                <p>Sponsorship is category-based, with one sponsor per category at a time.</p>
                <p>All sponsors are manually approved, payment is required before going live, and cards are static only.</p>
                <p>Sponsors can also create and share their own polls for extra engagement, while Poll & See chooses independently which polls to promote.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
              <h2 className="mb-4 text-2xl font-semibold">Pricing calculator</h2>

              <p className="mb-2 text-sm font-medium text-gray-300">Categories interested in</p>
              <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className="mb-5 h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
              />

              <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
                <div className="grid gap-2 text-sm text-gray-300">
                  <div className="flex justify-between gap-4">
                    <span>Selected categories</span>
                    <span className="font-medium text-white">{pricing.categoryCount}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Days</span>
                    <span className="font-medium text-white">{pricing.days}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Discount applied</span>
                    <span className="font-medium text-white">{Math.round(pricing.discount * 100)}%</span>
                  </div>
                  <div className="mt-3 flex justify-between border-t border-gray-700 pt-3 text-base">
                    <span>Total price</span>
                    <span className="font-semibold text-white">£{pricing.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
              <h2 className="mb-4 text-2xl font-semibold">Sponsor preview</h2>

              <div className="rounded-2xl border border-gray-700 bg-gray-800/90 p-3">
                <div className="flex min-h-[92px] items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gray-700 bg-gray-900 text-lg font-bold text-white">
                    P&S
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Sponsored
                    </p>
                    <p className="truncate text-sm font-semibold text-white">
                      Your Business
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-gray-300">
                      A short, clean headline for active Poll & See voters.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-medium text-black">
                    Learn more
                  </span>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5 lg:sticky lg:top-6 lg:self-start">
            <h2 className="mb-4 text-2xl font-semibold">Enquire</h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                value={formData.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Name"
                required
                className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
              />

              <input
                value={formData.businessName}
                onChange={(event) => updateField("businessName", event.target.value)}
                placeholder="Business name"
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

              <input
                value={formData.destination}
                onChange={(event) => updateField("destination", event.target.value)}
                placeholder="Website or WhatsApp destination link"
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
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                placeholder="Number of days"
                className="h-11 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white outline-none focus:border-gray-500"
              />

              <textarea
                value={formData.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder="Message"
                rows={4}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none focus:border-gray-500"
              />

              <button
                type="submit"
                disabled={sending}
                className="h-11 w-full cursor-pointer rounded-xl bg-white px-4 text-sm font-medium text-black transition hover:bg-gray-200 disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send enquiry"}
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