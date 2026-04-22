"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

type PollCreateResponse = {
  pollUrl: string;
  shareText: string;
  slug: string;
  emailSent?: boolean;
};

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
  const [emailMeLink] = useState(false);
  const [options, setOptions] = useState([createEmptyOption(), createEmptyOption()]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [successData, setSuccessData] = useState<PollCreateResponse | null>(null);

  const canAddOption = useMemo(() => options.length < 6, [options.length]);
  const canRemoveOption = useMemo(() => options.length > 2, [options.length]);

  const inputClasses =
    "w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500";
  const textareaClasses =
    "w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:border-gray-500";
  const checkboxClasses =
    "h-5 w-5 shrink-0 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500";
  const labelClasses = "block text-sm font-normal text-white mb-2";
  const checkboxLabelClasses = "inline-flex items-center gap-3 text-sm font-normal text-white";
  const helperTextClasses = "text-sm text-gray-400 md:text-base";

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
    setSubmitting(false);
    setMessage("");
    setMessageType("");
    setSuccessData(null);
  };

  const handleQuestionChange = (value: string) => {
    setQuestion(value);
    setCategory(value.trim() ? suggestCategory(value) : "");
  };

  const shouldShowEmailField = false;

  const handleCopy = async () => {
    if (!successData) return;
    try {
      await navigator.clipboard.writeText(successData.shareText);
    } catch {
      setMessageType("error");
      setMessage("Could not copy link.");
    }
  };

  const handleShare = async () => {
    if (!successData) return;

    if (navigator.share) {
      try {
        await navigator.share({
          text: successData.shareText,
        });
        return;
      } catch {
        // fall through to clipboard
      }
    }

    await handleCopy();
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

    if (shouldShowEmailField && !email.trim()) {
      setMessageType("error");
      setMessage("Email is required.");
      return;
    }

    if (question.trim().length > 150) {
      setMessageType("error");
      setMessage("Question must be 150 characters or fewer.");
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

    try {
      const response = await fetch("/api/polls/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim() || null,
          emailMeLink,
          question: question.trim(),
          description: description.trim() || null,
          category: resolvedCategory,
          options: cleanedOptions.map((option) => option.text),
          optionImageUrls: usesImages ? cleanedOptions.map((option) => option.imageUrl) : [],
          isPrivate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setSuccessData(data as PollCreateResponse);
      setMessageType("success");
      setMessage("");
      setSubmitting(false);
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
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
              href="/results"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border border-gray-700 bg-gray-900 px-3 md:px-5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Results
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

      <section className="max-w-3xl mx-auto px-6 pt-1 pb-6">
        <div className="text-center">
             <h1 className="text-4xl font-bold md:text-[3.75rem]">Create a Poll</h1>

                     <div className="mt-6 space-y-2">
            <p className="text-[2rem] font-semibold text-white">
              Get your shareable link instantly
            </p>
            <p className="text-sm text-gray-300 md:text-base">
              No sign-up required. Your link will appear instantly below.
            </p>
          </div>
        </div>

        <div className="mt-9 bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
          {successData ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold text-white">Your poll is live</h2>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-500"
                >
                  Copy link
                </button>

                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="rounded-xl border border-gray-700 bg-gray-900 px-5 py-3 font-medium text-white transition hover:bg-gray-800"
                >
                  Share
                </button>
              </div>

              <div className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 break-all text-sm text-gray-200">
                {successData.pollUrl}
              </div>

              <p className="text-sm text-gray-400">
                Public polls may appear on Poll & See after review.
              </p>

              <button
                type="button"
                onClick={resetPollFields}
                className="rounded-xl border border-gray-700 bg-gray-900 px-5 py-3 font-medium text-white transition hover:bg-gray-800"
              >
                Create another poll
              </button>
            </div>
                    ) : (
            <>
             
              <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClasses}>Poll Question</label>
                <input
                  maxLength={150}
                  value={question}
                  onChange={(e) => handleQuestionChange(e.target.value)}
                  className={inputClasses}
                  placeholder="e.g. A job you love with low pay, or a job you hate with high pay?"
                />
                <p className="mt-1 text-sm text-gray-400 md:text-base">{question.length}/150</p>
              </div>

              <div>
                <label className={labelClasses}>Description (optional)</label>
                <textarea
                  maxLength={200}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={textareaClasses}
                  rows={3}
                  placeholder="Add context if helpful"
                />
                <p className="mt-1 text-sm text-gray-400 md:text-base">{description.length}/200</p>
              </div>

              <div>
                <label className={checkboxLabelClasses}>
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
                    <p className={helperTextClasses}>
                      Paste a direct image link into each option. All options must include an image.
                    </p>
                    <p className={helperTextClasses}>
                      Best results: square images (1:1), minimal empty space. Ideal size 700×700 or 1000×1000 px.
                    </p>
                  </div>
                ) : null}
              </div>

              <div>
            <label className={labelClasses}>
                  Poll options (2–6)
                </label>

            <p className="mb-2 text-xs text-gray-400">
                  Fewer options usually give clearer results
                </p>

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

                        <div className="space-y-1">
                <label className={checkboxLabelClasses}>
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className={checkboxClasses}
                  />
                  <span>Make this poll private</span>
                </label>

                <p className="text-xs text-gray-300">
                  Never shown publicly on Poll & See.
                </p>

                <p className="text-xs text-gray-300">
                  Public polls may appear on the Poll & See homepage after review.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-gray-400">
                  Polls may be edited for clarity, spelling, or shareability, or removed if they breach our guidelines.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Create Poll"}
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
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}