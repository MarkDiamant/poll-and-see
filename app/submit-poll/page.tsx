"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const CATEGORY_OPTIONS = [
  "General",
  "Lifestyle",
  "Community",
  "Finance",
  "Business",
  "Education",
  "Fun",
];

export default function SubmitPollPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const canAddOption = useMemo(() => options.length < 4, [options.length]);
  const canRemoveOption = useMemo(() => options.length > 2, [options.length]);

  const updateOption = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  // ✅ keeps name + email
  const resetPollFields = () => {
    setQuestion("");
    setDescription("");
    setCategory("");
    setOptions(["", ""]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanedOptions = options.map((o) => o.trim());

    if (!name.trim() || !email.trim() || !question.trim() || !category.trim()) {
      setMessageType("error");
      setMessage("Please fill in all required fields.");
      return;
    }

    if (question.length > 100) {
      setMessageType("error");
      setMessage("Question must be 100 characters or fewer.");
      return;
    }

    if (description.length > 200) {
      setMessageType("error");
      setMessage("Description must be 200 characters or fewer.");
      return;
    }

    if (cleanedOptions.some((o) => !o)) {
      setMessageType("error");
      setMessage("Options cannot be empty.");
      return;
    }

    if (cleanedOptions.some((o) => o.length > 40)) {
      setMessageType("error");
      setMessage("Each option must be 40 characters or fewer.");
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
        category: category.trim(),
        options: cleanedOptions,
      },
    ]);

    if (error) {
      console.error(error);
      setMessageType("error");
      setMessage("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    resetPollFields();

    setMessageType("success");
    setMessage("Thanks — your poll has been submitted for review.");
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">

      {/* ✅ HEADER */}
      <header className="max-w-6xl mx-auto px-4 md:px-6 pt-5 pb-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0">
            <img
              src="/logo.png"
              alt="Poll & See"
              className="h-12 md:h-16 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm text-white hover:bg-gray-800"
            >
              Home
            </Link>

            <Link
              href="/submit-poll"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm text-white hover:bg-blue-500"
            >
              Create Poll
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <section className="max-w-3xl mx-auto px-6 pt-6 pb-12">
        <Link href="/" className="text-sm text-blue-300 hover:underline">
          ← Back to homepage
        </Link>

        <div className="mt-6 bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h1 className="text-3xl font-bold mb-3">Create a Poll</h1>

          <p className="text-gray-300 mb-8">
            Want to know what people really think? Create your poll.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name */}
            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 px-4 py-3 rounded-xl"
            />

            {/* Email */}
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 px-4 py-3 rounded-xl"
            />

            {/* Question */}
            <input
              placeholder="Poll Question"
              maxLength={100}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 px-4 py-3 rounded-xl"
            />

            {/* Description */}
            <textarea
              placeholder="Poll Description (optional)"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 px-4 py-3 rounded-xl"
            />

            {/* Category */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 px-4 py-3 rounded-xl"
            >
              <option value="">Select category</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

            {/* Options */}
            {options.map((option, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={option}
                  maxLength={40}
                  onChange={(e) => updateOption(i, e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 px-4 py-3 rounded-xl"
                />
                {canRemoveOption && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="px-3 bg-gray-700 rounded-xl"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            {canAddOption && (
              <button
                type="button"
                onClick={addOption}
                className="text-blue-300 text-sm"
              >
                + Add option
              </button>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={submitting}
              className="bg-white text-black px-5 py-3 rounded-xl font-medium"
            >
              {submitting ? "Submitting..." : "Create Poll"}
            </button>

            {/* Message */}
            {message && (
              <p className="text-green-400 text-sm">{message}</p>
            )}
          </form>
        </div>
      </section>

      {/* ✅ FOOTER */}
      <footer className="text-center text-sm text-gray-500 py-8">
        © {new Date().getFullYear()} Poll & See
      </footer>
    </main>
  );
}