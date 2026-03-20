"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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
    if (options.length < 4) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanedOptions = options.map((option) => option.trim());

    if (!name.trim() || !email.trim() || !question.trim() || !category.trim()) {
      setMessageType("error");
      setMessage("Please fill in all required fields.");
      return;
    }

    if (question.trim().length > 100) {
      setMessageType("error");
      setMessage("Question must be 100 characters or fewer.");
      return;
    }

    if (description.trim().length > 200) {
      setMessageType("error");
      setMessage("Description must be 200 characters or fewer.");
      return;
    }

    if (cleanedOptions.length < 2) {
      setMessageType("error");
      setMessage("Please add at least 2 options.");
      return;
    }

    if (cleanedOptions.length > 4) {
      setMessageType("error");
      setMessage("You can add up to 4 options only.");
      return;
    }

    if (cleanedOptions.some((option) => !option)) {
      setMessageType("error");
      setMessage("Option fields cannot be empty.");
      return;
    }

    if (cleanedOptions.some((option) => option.length > 40)) {
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
      console.error("Poll submission error:", error);
      setMessageType("error");
      setMessage(error.message || "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setMessageType("success");
    setMessage("Thanks — your poll has been submitted for review.");
    setName("");
    setEmail("");
    setQuestion("");
    setDescription("");
    setCategory("");
    setOptions(["", ""]);
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <section className="max-w-3xl mx-auto px-6 pt-10 pb-12">
        <Link href="/" className="text-sm text-blue-300 hover:underline">
          ← Back to homepage
        </Link>

        <div className="mt-6 bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
          <h1 className="text-3xl font-bold mb-3">Create a Poll</h1>
          <p className="text-gray-300 mb-8">
            Want to know what people really think? Create your poll.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Poll Question</label>
              <input
                type="text"
                maxLength={100}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none"
                placeholder="What should people vote on?"
              />
              <p className="mt-1 text-xs text-gray-400">{question.length}/100</p>
            </div>

            <div>
              <label className="block text-sm mb-2">Poll Description (optional)</label>
              <textarea
                value={description}
                maxLength={200}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none"
                placeholder="Optional extra context"
              />
              <p className="mt-1 text-xs text-gray-400">{description.length}/200</p>
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

            <div>
              <label className="block text-sm mb-2">Poll Options (2–4 inputs)</label>
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-3">
                    <input
                      type="text"
                      maxLength={40}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none"
                      placeholder={`Option ${index + 1}`}
                    />
                    {canRemoveOption && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="rounded-xl border border-gray-700 px-4 py-3 text-sm text-white hover:bg-gray-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={addOption}
                  disabled={!canAddOption}
                  className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  Add option
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-white text-black px-5 py-3 rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Create Poll"}
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