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
] as const;

type Category = (typeof CATEGORY_OPTIONS)[number] | "";

function suggestCategory(question: string): Category {
  const q = question.toLowerCase().trim();

  if (!q) return "";

  if (
    q.includes("school") ||
    q.includes("teacher") ||
    q.includes("student") ||
    q.includes("students") ||
    q.includes("homework") ||
    q.includes("university") ||
    q.includes("college") ||
    q.includes("exam") ||
    q.includes("education") ||
    q.includes("classroom") ||
    q.includes("learning") ||
    q.includes("degree") ||
    q.includes("tuition")
  ) {
    return "Education";
  }

  if (
    q.includes("money") ||
    q.includes("salary") ||
    q.includes("cost") ||
    q.includes("price") ||
    q.includes("prices") ||
    q.includes("rent") ||
    q.includes("mortgage") ||
    q.includes("tax") ||
    q.includes("income") ||
    q.includes("finance") ||
    q.includes("financial") ||
    q.includes("bills") ||
    q.includes("saving") ||
    q.includes("savings") ||
    q.includes("afford") ||
    q.includes("affording") ||
    q.includes("expenses") ||
    q.includes("paid") ||
    q.includes("pay rise") ||
    q.includes("wages") ||
    q.includes("debt")
  ) {
    return "Finance";
  }

  if (
    q.includes("business") ||
    q.includes("startup") ||
    q.includes("marketing") ||
    q.includes("customer") ||
    q.includes("customers") ||
    q.includes("sales") ||
    q.includes("office") ||
    q.includes("remote work") ||
    q.includes("hybrid work") ||
    q.includes("workplace") ||
    q.includes("company") ||
    q.includes("career") ||
    q.includes("job market") ||
    q.includes("manager") ||
    q.includes("employee") ||
    q.includes("employees") ||
    q.includes("boss") ||
    q.includes("entrepreneur") ||
    q.includes("freelance")
  ) {
    return "Business";
  }

  if (
    q.includes("community") ||
    q.includes("local") ||
    q.includes("neighbour") ||
    q.includes("neighbor") ||
    q.includes("neighbourhood") ||
    q.includes("neighborhood") ||
    q.includes("communal") ||
    q.includes("public support") ||
    q.includes("charity") ||
    q.includes("volunteer") ||
    q.includes("volunteering") ||
    q.includes("council") ||
    q.includes("area") ||
    q.includes("high street") ||
    q.includes("public services")
  ) {
    return "Community";
  }

  if (
    q.includes("dating") ||
    q.includes("relationship") ||
    q.includes("relationships") ||
    q.includes("marriage") ||
    q.includes("married") ||
    q.includes("parent") ||
    q.includes("parents") ||
    q.includes("parenting") ||
    q.includes("family") ||
    q.includes("kids") ||
    q.includes("children") ||
    q.includes("child") ||
    q.includes("baby") ||
    q.includes("babies") ||
    q.includes("health") ||
    q.includes("healthy") ||
    q.includes("mental health") ||
    q.includes("fitness") ||
    q.includes("exercise") ||
    q.includes("gym") ||
    q.includes("diet") ||
    q.includes("sleep") ||
    q.includes("routine") ||
    q.includes("work life balance") ||
    q.includes("work-life balance") ||
    q.includes("social media") ||
    q.includes("screen time") ||
    q.includes("phone use") ||
    q.includes("phones") ||
    q.includes("lifestyle") ||
    q.includes("home life") ||
    q.includes("stress") ||
    q.includes("wellbeing") ||
    q.includes("well-being")
  ) {
    return "Lifestyle";
  }

  if (
    q.includes("fun") ||
    q.includes("favourite") ||
    q.includes("favorite") ||
    q.includes("movie") ||
    q.includes("film") ||
    q.includes("music") ||
    q.includes("pizza") ||
    q.includes("game") ||
    q.includes("games") ||
    q.includes("holiday") ||
    q.includes("weekend") ||
    q.includes("tv show") ||
    q.includes("series") ||
    q.includes("food") ||
    q.includes("best snack") ||
    q.includes("would you rather")
  ) {
    return "Fun";
  }

  return "General";
}

export default function SubmitPollPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("");
  const [options, setOptions] = useState(["", ""]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [categoryTouched, setCategoryTouched] = useState(false);

  const canAddOption = useMemo(() => options.length < 4, [options.length]);
  const canRemoveOption = useMemo(() => options.length > 2, [options.length]);

  const suggestedCategory = question.trim() ? suggestCategory(question) : "";

  const inputClasses =
    "w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500";
  const textareaClasses =
    "w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500";

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

  const resetPollFields = () => {
    setQuestion("");
    setDescription("");
    setCategory("");
    setOptions(["", ""]);
    setCategoryTouched(false);
  };

  const handleQuestionChange = (value: string) => {
    setQuestion(value);

    if (!categoryTouched) {
      setCategory(value.trim() ? suggestCategory(value) : "");
    }
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value as Category);
    setCategoryTouched(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanedOptions = options.map((o) => o.trim());

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

    resetPollFields();
    setMessageType("success");
    setMessage("Thanks — your poll has been submitted for review.");
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <header className="max-w-6xl mx-auto px-4 md:px-6 pt-5 pb-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0" aria-label="Go to homepage">
            <img
              src="/logo.png"
              alt="Poll & See"
              className="h-12 md:h-16 w-auto object-contain block"
            />
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border border-gray-700 bg-gray-900 px-3 md:px-5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Home
            </Link>

            <Link
              href="/submit-poll"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-blue-600 px-3 md:px-5 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Create Poll
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 pt-6 pb-12">
        <Link href="/" className="text-sm text-blue-300 hover:underline">
          ← Back to homepage
        </Link>

        <div className="mt-6 text-center">
          <h1 className="text-4xl font-bold md:text-[4.25rem]">Create a Poll</h1>

          <div className="mt-6 space-y-3">
            <p className="text-lg text-white">
              Ask a question. Share the link. Watch votes come in live.
            </p>
            <p className="text-gray-300">
              Share with your contacts, team or community to see what people really think.
            </p>
            <p className="text-gray-300">Most polls are live within 24 hours.</p>
          </div>
        </div>

        <div className="mt-9 bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm mb-2">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClasses}
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
                placeholder="you@email.com"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Poll Question</label>
              <input
                maxLength={100}
                value={question}
                onChange={(e) => handleQuestionChange(e.target.value)}
                className={inputClasses}
                placeholder="e.g. Should school fees come before holidays when money is tight?"
              />
              <p className="mt-1 text-xs text-gray-400">{question.length}/100</p>
            </div>

            <div>
              <label className="block text-sm mb-2">Optional description</label>
              <textarea
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={textareaClasses}
                rows={3}
                placeholder="Add context if helpful (optional)"
              />
              <p className="mt-1 text-xs text-gray-400">{description.length}/200</p>
            </div>

            <div>
              <label className="block text-sm mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={inputClasses}
              >
                <option value="">Select category</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {suggestedCategory && !categoryTouched && (
                <p className="mt-1 text-xs text-gray-400">
                  Suggested category: {suggestedCategory}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm mb-2">Poll Options (2–4 inputs)</label>

              <div className="space-y-3">
                {options.map((option, i) => {
                  const optionPlaceholder =
                    i === 0 ? "Yes" : i === 1 ? "No" : i === 2 ? "Depends" : `Option ${i + 1}`;

                  return (
                    <div key={i} className="flex gap-2">
                      <input
                        maxLength={40}
                        value={option}
                        onChange={(e) => updateOption(i, e.target.value)}
                        className={inputClasses}
                        placeholder={optionPlaceholder}
                      />
                      {canRemoveOption && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="px-3 bg-gray-700 rounded-xl whitespace-nowrap transition hover:bg-gray-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {canAddOption && (
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-3 text-sm text-blue-300"
                >
                  + Add option
                </button>
              )}
            </div>

            <button
              type={messageType === "success" ? "button" : "submit"}
              onClick={() => {
                if (messageType === "success") {
                  setMessage("");
                  setMessageType("");
                }
              }}
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
            >
              {messageType === "success"
                ? "Create another poll"
                : submitting
                ? "Submitting..."
                : "Create Poll"}
            </button>

            {message && (
              <p
                className={`text-sm ${
                  messageType === "success" ? "text-green-400" : "text-red-400"
                }`}
              >
                {message}
              </p>
            )}
          </form>
        </div>
      </section>

      <footer className="text-center text-sm text-gray-500 py-8">
        © {new Date().getFullYear()} Poll & See
      </footer>
    </main>
  );
}