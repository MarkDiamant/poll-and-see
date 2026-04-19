"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Footer from "@/components/Footer";

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

function createEmptyOption() {
  return { text: "", imageUrl: "" };
}

export default function SubmitPollPage() {
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("");
  const [usesImages, setUsesImages] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [options, setOptions] = useState([createEmptyOption(), createEmptyOption()]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const canAddOption = useMemo(() => options.length < 6, [options.length]);
  const canRemoveOption = useMemo(() => options.length > 2, [options.length]);

  const inputClasses =
    "w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500";
  const textareaClasses =
    "w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500";
  const checkboxClasses =
    "h-5 w-5 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500";

  const updateOptionText = (index: number, value: string) => {
    const next = [...options];
    next[index] = { ...next[index], text: value };
    setOptions(next);
  };

  const updateOptionImageUrl = (index: number, value: string) => {
    const next = [...options];
    next[index] = { ...next[index], imageUrl: value };
    setOptions(next);
  };

  const addOption = () => {
    if (options.length < 6) setOptions([...options, createEmptyOption()]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const resetPollFields = () => {
    setEmail("");
    setQuestion("");
    setDescription("");
    setCategory("");
    setOptions([createEmptyOption(), createEmptyOption()]);
    setUsesImages(false);
    setIsPrivate(false);
  };

  const handleQuestionChange = (value: string) => {
    setQuestion(value);
    setCategory(value.trim() ? suggestCategory(value) : "");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanedOptions = options.map((option) => ({
      text: option.text.trim(),
      imageUrl: option.imageUrl.trim(),
    }));

    const resolvedCategory = category.trim() || suggestCategory(question) || "General";

    if (!question.trim()) {
      setMessageType("error");
      setMessage("Please fill in all required fields.");
      return;
    }

    if (isPrivate && !email.trim()) {
      setMessageType("error");
      setMessage("Email is required for private polls.");
      return;
    }

    if (question.trim().length > 120) {
      setMessageType("error");
      setMessage("Question must be 120 characters or fewer.");
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

    if (cleanedOptions.length > 6) {
      setMessageType("error");
      setMessage("Maximum 6 options allowed.");
      return;
    }

    if (cleanedOptions.some((option) => !option.text)) {
      setMessageType("error");
      setMessage("Options cannot be empty.");
      return;
    }

    if (cleanedOptions.some((option) => option.text.length > 40)) {
      setMessageType("error");
      setMessage("Each option must be 40 characters or fewer.");
      return;
    }

    if (usesImages) {
      const hasMissingImageUrl = cleanedOptions.some((option) => !option.imageUrl);

      if (hasMissingImageUrl) {
        setMessageType("error");
        setMessage("If image mode is enabled, every option must include an image URL.");
        return;
      }
    }

    setSubmitting(true);
    setMessage("");
    setMessageType("");

    const { error } = await supabase.from("poll_submissions").insert([
      {
        name: null,
        email: isPrivate ? email.trim() : null,
        question: question.trim(),
        description: description.trim() || null,
        category: resolvedCategory,
        options: cleanedOptions.map((option) => option.text),
        option_image_urls: usesImages
          ? cleanedOptions.map((option) => option.imageUrl)
          : null,
        is_private: isPrivate,
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

      <section className="max-w-3xl mx-auto px-6 pt-1 pb-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold md:text-[4.25rem]">Create a Poll</h1>

          <div className="mt-6 space-y-3">
            <p className="text-lg text-white">
              Ask a question. Share the link. Watch responses come in live.
            </p>
            <p className="text-gray-300">
              Share with your contacts, team or community to quickly see what people really think.
            </p>
          </div>
        </div>

        <div className="mt-9 bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm mb-2">Poll Question</label>
              <input
                maxLength={120}
                value={question}
                onChange={(e) => handleQuestionChange(e.target.value)}
                className={inputClasses}
                placeholder="e.g. A job you love with low pay, or a job you hate with high pay?"
              />
              <p className="mt-1 text-sm text-gray-400 md:text-base">{question.length}/120</p>
            </div>

            <div>
              <label className="block text-sm mb-2">Description (optional)</label>
              <textarea
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={textareaClasses}
                rows={3}
                placeholder="Add context if helpful (optional)"
              />
              <p className="mt-1 text-sm text-gray-400 md:text-base">{description.length}/200</p>
            </div>

            <div>
              <label className="inline-flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={usesImages}
                  onChange={(e) => setUsesImages(e.target.checked)}
                  className={checkboxClasses}
                />
                <span>This poll uses images</span>
              </label>

              {usesImages ? (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-400 md:text-base">
                    Paste a direct image link into each option. All options must include an image.
                  </p>
                  <p className="text-sm text-gray-400 md:text-base">
                    Best results: square images (1:1), minimal empty space. Ideal size 700×700 or 1000×1000 px.
                  </p>
                </div>
              ) : null}
            </div>

            <div>
              <label className="block text-sm mb-2">
  Poll Options (choose 2 to 6 options. Fewer options usually give clearer results.)
</label>

              <div className="space-y-4">
                {options.map((option, i) => {
                  const optionPlaceholder =
                    i === 0 ? "Yes" : i === 1 ? "No" : i === 2 ? "Depends" : `Option ${i + 1}`;

                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          maxLength={40}
                          value={option.text}
                          onChange={(e) => updateOptionText(i, e.target.value)}
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

                      {usesImages ? (
                        <div>
                          <input
                            value={option.imageUrl}
                            onChange={(e) => updateOptionImageUrl(i, e.target.value)}
                            className={inputClasses}
                            placeholder="https://example.com/image.jpg"
                          />
                          <p className="mt-1 text-sm text-gray-400 md:text-base">
                            Direct image URL (jpg, png, webp etc.)
                          </p>
                        </div>
                      ) : null}
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

            <div className="space-y-2">
              <label className="inline-flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => {
                    const nextChecked = e.target.checked;
                    setIsPrivate(nextChecked);
                    if (!nextChecked) {
                      setEmail("");
                    }
                  }}
                  className={checkboxClasses}
                />
                <span>Make this poll private</span>
              </label>

              <p className="text-sm text-gray-400 md:text-base">
  Private polls won't appear on the homepage or in the automatic polls shown after voting. We'll email you the private link so you can share it.
</p>
            </div>

            {isPrivate ? (
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
            ) : null}

            <div className="space-y-2">
              <p className="text-sm text-gray-400">
  Most polls are reviewed within 24 hours. We may lightly edit wording for clarity while keeping your question and options as close as possible to your original meaning.
</p>
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

      <Footer />
    </main>
  );
}