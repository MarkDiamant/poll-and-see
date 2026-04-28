"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";

export default function AddToWebsitePage() {
  const [website, setWebsite] = useState("");
  const [pollText, setPollText] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitting(true);
    setSuccess(false);
    setError("");

    try {
      const response = await fetch("/api/embed-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          website: website.trim(),
          pollText: pollText.trim(),
          email: email.trim(),
          source: "embed page",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not submit request.");
      }

      setSuccess(true);
      setWebsite("");
      setPollText("");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <SiteHeader />

     <section className="mx-auto max-w-5xl px-3 pb-12 pt-6 md:px-6">
        <div className="mb-8 rounded-2xl border border-gray-700 bg-gray-800 p-6 text-center shadow-lg">
          <h1 className="mb-5 text-3xl font-bold md:text-4xl">
            Add Poll &amp; See to your website
          </h1>
          <p className="mb-6 text-base text-gray-300 md:text-lg">
            Add a simple poll to your website so visitors can vote without leaving your site
          </p>

<img
  src="/embed-assets/plm-before.png"
  alt="Poll & See embedded on a website"
  className="-mx-3 w-[calc(100%+24px)] max-w-none rounded-xl border border-gray-700 shadow-lg md:mx-auto md:w-full md:max-w-4xl"
/>
        </div>

       <div className="mb-8 rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg overflow-hidden">
          <h2 className="mb-6 text-center text-2xl font-semibold">
            See how it works on real websites
          </h2>

<div className="grid gap-6 md:grid-cols-2">
  <div className="flex flex-col items-center">
    <a
      href="https://www.precisionlinemarking.co.uk/"
      target="_blank"
      rel="noreferrer"
      className="w-full"
    >
      <img
        src="/embed-assets/plm-after.png"
        alt="Poll & See embed example after voting"
       className="-mx-6 w-[calc(100%+48px)] max-w-none rounded-xl border border-gray-700 shadow-lg transition hover:opacity-90 md:mx-0 md:w-full"
      />
    </a>
    <a
      href="https://www.precisionlinemarking.co.uk/"
      target="_blank"
      rel="noreferrer"
      className="mt-3 text-base text-gray-300 hover:text-white underline"
    >
      See it live
    </a>
  </div>

  <div className="flex flex-col items-center">
    <a
      href="https://www.diamantsolutions.co.uk/"
      target="_blank"
      rel="noreferrer"
      className="w-full"
    >
      <img
        src="/embed-assets/diamant-before.png"
        alt="Poll & See embedded on another website"
      className="-mx-6 w-[calc(100%+48px)] max-w-none rounded-xl border border-gray-700 shadow-lg transition hover:opacity-90 md:mx-0 md:w-full"
      />
    </a>
    <a
      href="https://www.diamantsolutions.co.uk/"
      target="_blank"
      rel="noreferrer"
      className="mt-3 text-base text-gray-300 hover:text-white underline"
    >
      See it live
    </a>
  </div>
</div>
        </div>

        <div className="mb-8 rounded-2xl border border-gray-700 bg-gray-800 p-5 text-center shadow-lg">
          <p className="text-base font-medium text-gray-200">
            We’ll set everything up and send you what you need.
          </p>
        </div>

        <div className="mx-auto max-w-2xl rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <h3 className="mb-2 text-center text-2xl font-semibold">
            Get this on your site
          </h3>
          <p className="mb-6 text-center text-sm text-gray-300">
            Early access — free while we’re testing
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="yourwebsite.com"
              required
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500"
            />

            <textarea
              value={pollText}
              onChange={(event) => setPollText(event.target.value)}
              placeholder="Write your question + options (e.g. What matters most… Price / Quality / Speed)"
              required
              rows={4}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500"
            />

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              required
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500"
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Request access"}
            </button>
          </form>

          {success ? (
            <p className="mt-4 rounded-xl border border-green-500/40 bg-green-950/40 px-4 py-3 text-sm text-green-200">
              We’ll set this up and send everything you need to get live.
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      <Footer />
    </main>
  );
}