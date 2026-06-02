"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AdvertiserEnquiry = {
  id: number;
  created_at: string | null;
  enquiry_type: "question" | "booking";
  status: string;
  name: string;
  business_name: string | null;
  email: string;
  phone: string | null;
  destination: string | null;
  categories: string | null;
  days: number | null;
  preferred_start_date: string | null;
  headline: string | null;
  cta_text: string | null;
  logo_url: string | null;
  theme: string | null;
  message: string | null;
};

const ADMIN_KEY_STORAGE = "pollandsee-admin-key";

const STATUS_OPTIONS = ["new", "contacted", "invoiced", "paid", "live", "closed"];

function badge(count: number, isActive: boolean) {
  return (
    <span
      className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
        isActive ? "bg-black/10 text-black" : "bg-white/10 text-white"
      }`}
    >
      {count}
    </span>
  );
}

function normaliseExternalUrl(value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function buildSponsorDates(startDate: string | null, days: number | null) {
  if (!startDate) return { startAt: "", endAt: "" };

  const startAt = `${startDate}T00:00:00.000Z`;
  const end = new Date(startAt);
  end.setUTCDate(end.getUTCDate() + Math.max(days || 1, 1));

  return {
    startAt,
    endAt: end.toISOString(),
  };
}

export default function AdminAdvertiserEnquiriesPage() {
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [enquiries, setEnquiries] = useState<AdvertiserEnquiry[]>([]);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_KEY_STORAGE) || "";
    if (saved) {
      setAdminKey(saved);
      setAdminKeyInput(saved);
    }
  }, []);

  useEffect(() => {
    if (!adminKey) return;

    const loadEnquiries = async () => {
      const response = await fetch("/api/admin/advertiser-enquiries", {
        headers: { "x-admin-key": adminKey },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not load advertiser enquiries.");
        return;
      }

      setEnquiries(data.enquiries || []);
    };

    void loadEnquiries();

    const interval = window.setInterval(loadEnquiries, 8000);
    return () => window.clearInterval(interval);
  }, [adminKey]);

  const filteredEnquiries = enquiries.filter((enquiry) =>
    statusFilter === "all" ? true : enquiry.status === statusFilter
  );

  const handleUnlock = () => {
    const trimmed = adminKeyInput.trim();
    if (!trimmed) return;
    sessionStorage.setItem(ADMIN_KEY_STORAGE, trimmed);
    setAdminKey(trimmed);
    setError("");
  };

  const createAdvertiserFromEnquiry = async (enquiry: AdvertiserEnquiry) => {
    setSavingKey(`create:${enquiry.id}`);
    setError("");

    try {
      const dates = buildSponsorDates(enquiry.preferred_start_date, enquiry.days);

      const response = await fetch("/api/admin/sponsors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          business_name: enquiry.business_name || "",
          headline: enquiry.headline || "",
          logo_url: enquiry.logo_url || "",
          cta_text: enquiry.cta_text || "Learn more",
          destination_url: normaliseExternalUrl(enquiry.destination),
          category: enquiry.categories || "",
          start_at: dates.startAt,
          end_at: dates.endAt,
          is_active: false,
          theme: enquiry.theme || "default",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create advertiser.");
      }

      await updateStatus(enquiry.id, "paid");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create advertiser.");
    } finally {
      setSavingKey("");
    }
  };

  const updateStatus = async (id: number, status: string) => {
    setSavingKey(`status:${id}`);
    setError("");

    try {
      const response = await fetch("/api/admin/advertiser-enquiries", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ id, status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not update enquiry.");
      }

      setEnquiries((current) =>
        current.map((item) => (item.id === id ? data.enquiry : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update enquiry.");
    } finally {
      setSavingKey("");
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
          <p className="mb-5 text-sm text-gray-300">Enter your admin key to manage advertiser enquiries.</p>

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
              <h1 className="text-3xl font-semibold">Advertiser enquiries</h1>
              <p className="mt-1 text-sm text-gray-300">Review questions and sponsorship bookings.</p>
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
            <Link href="/admin/sponsors" className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
              Advertisers
            </Link>
            <Link href="/admin/advertiser-enquiries" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">
              <span>Enquiries</span>
              {badge(enquiries.length, true)}
            </Link>
          </nav>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-xl border border-gray-700 bg-gray-900 px-3 text-sm text-white outline-none"
          >
            <option value="all">All enquiry statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-700 bg-gray-800 shadow-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-left text-gray-300">
              <tr>
                <th className="px-4 py-3 font-medium">Enquiry</th>
                <th className="px-4 py-3 font-medium">Advert details</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-300">
                    No advertiser enquiries yet.
                  </td>
                </tr>
              ) : null}

              {filteredEnquiries.map((enquiry) => (
                <tr key={enquiry.id} className="border-t border-gray-700 align-top">
                  <td className="min-w-[260px] px-4 py-4">
                    <p className="font-semibold text-white">
                      {enquiry.enquiry_type === "question" ? "Question" : "Booking"}
                    </p>
                    <p className="mt-1 text-gray-300">{enquiry.name}</p>
                    <p className="text-gray-400">{enquiry.email}</p>
                    {enquiry.phone ? <p className="text-gray-400">{enquiry.phone}</p> : null}
                    <p className="mt-2 text-xs text-gray-500">
                      {enquiry.created_at ? new Date(enquiry.created_at).toLocaleString() : ""}
                    </p>
                  </td>

                  <td className="min-w-[320px] px-4 py-4 text-gray-300">
                    <p><span className="text-gray-500">Business:</span> {enquiry.business_name || "Not provided"}</p>
                    <p><span className="text-gray-500">Categories:</span> {enquiry.categories || "Not provided"}</p>
                    <p><span className="text-gray-500">Days:</span> {enquiry.days || "Not provided"}</p>
                    <p><span className="text-gray-500">Start:</span> {enquiry.preferred_start_date || "Not provided"}</p>
                    <p><span className="text-gray-500">Headline:</span> {enquiry.headline || "Not provided"}</p>
                    <p><span className="text-gray-500">CTA:</span> {enquiry.cta_text || "Not provided"}</p>
<p><span className="text-gray-500">Theme:</span> {enquiry.theme || "Not provided"}</p>
                    {enquiry.destination ? (
                      <a href={normaliseExternalUrl(enquiry.destination)} target="_blank" rel="noreferrer" className="mt-2 block text-blue-300 hover:text-blue-200">
                        Open destination
                      </a>
                    ) : null}
                    {enquiry.logo_url ? (
                      <a href={enquiry.logo_url} target="_blank" rel="noreferrer" className="block text-blue-300 hover:text-blue-200">
                        Open logo
                      </a>
                    ) : null}
                  </td>

                  <td className="min-w-[260px] px-4 py-4 text-gray-300">
                    {enquiry.message || "No message"}
                  </td>

                  <td className="min-w-[160px] px-4 py-4">
                    <select
                      value={enquiry.status}
                      disabled={savingKey === `status:${enquiry.id}`}
                      onChange={(event) => void updateStatus(enquiry.id, event.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    {enquiry.enquiry_type === "booking" ? (
                      <button
                        type="button"
                        onClick={() => void createAdvertiserFromEnquiry(enquiry)}
                        disabled={savingKey === `create:${enquiry.id}`}
                        className="mt-2 w-full rounded-lg bg-white px-3 py-2 text-left text-xs font-medium text-black transition hover:bg-gray-200 disabled:opacity-60"
                      >
                        {savingKey === `create:${enquiry.id}` ? "Creating..." : "Create advertiser"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}