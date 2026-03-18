"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SubmitPollPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !question.trim()) {
      setMessageType("error");
      setMessage("Please fill in name, email and question.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setMessageType("");

    const { error } = await supabase.from("poll_submissions").insert([
      {
        name: name.trim(),
        email: email.trim(),
        question: question.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
      },
    ]);

    if (error) {
      console.error("Poll submission error:", error);
      setMessageType("error");
      setMessage(error.message || "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setMessageType("success");
    setMessage("Thanks — your poll request has been submitted.");
    setName("");
    setEmail("");
    setQuestion("");
    setDescription("");
    setCategory("");
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <section className="max-w-3xl mx-auto px-6 pt-10 pb-12">
        <Link href="/" className="text-sm text-blue-300 hover:underline">
          ← Back to homepage
        </Link>

        <div className="mt-6 bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
          <h1 className="text-3xl font-bold mb-3">Submit a Poll</h1>
          <p className="text-gray-300 mb-8">
            Got a question people should vote on? Send it in for review.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm mb-2">Your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Your email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Poll question</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none"
                placeholder="What should people vote on?"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none"
                placeholder="Optional extra context"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Business, Education, Community"
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-white text-black px-5 py-3 rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit poll"}
            </button>

            {message && (
              <p
                className={`text-sm pt-2 ${
                  messageType === "success" ? "text-green-400" : "text-red-400"
                }`}
              >
                {message}
              </p>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}