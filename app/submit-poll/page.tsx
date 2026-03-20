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

  const resetForm = () => {
    setName("");
    setEmail("");
    setQuestion("");
    setDescription("");
    setCategory("");
    setOptions(["", ""]);
    setMessage("");
    setMessageType("");
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

    if (cleanedOptions.length < 2) {
      setMessageType("error");
      setMessage("Minimum 2 options required.");
      return;
    }

    if (cleanedOptions.length > 4) {
      setMessageType("error");
      setMessage("Maximum 4 options allowed.");
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

    setMessageType("success");
    setMessage("Thanks — your poll has been submitted for review.");
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
            {/* Name */}
            <div>
              <label className="block text-sm mb-2">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm mb-2">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3"
              />
            </div>

            {/* Question */}
            <div>
              <label className="block text-sm mb-2">Poll Question</label>
              <input
                maxLength={100}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3"
              />
              <p className="text-xs text-gray-400">{question.length}/100</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm mb-2">
                Poll Description (optional)
              </label>
              <textarea
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3"
              />
              <p className="text-xs text-gray-400">{description.length}/200</p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm mb-2">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3"
              />
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm mb-2">
                Poll Options (2–4 inputs)
              </label>

              {options.map((option, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    maxLength={40}
                    value={option}
                    onChange={(e) => updateOption(i, e.target.value)}
                    className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3"
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
                  className="mt-2 text-sm text-blue-300"
                >
                  + Add option
                </button>
              )}
            </div>

            {/* Button */}
            <button
              type={messageType === "success" ? "button" : "submit"}
              onClick={() => {
                if (messageType === "success") resetForm();
              }}
              disabled={submitting}
              className="bg-white text-black px-5 py-3 rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-60"
            >
              {messageType === "success"
                ? "Create another poll"
                : submitting
                ? "Submitting..."
                : "Create Poll"}
            </button>

            {/* Message */}
            {message && (
              <p
                className={`text-sm ${
                  messageType === "success"
                    ? "text-green-400"
                    : "text-red-400"
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