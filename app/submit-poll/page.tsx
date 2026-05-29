"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import ActivityIndicator from "@/components/ActivityIndicator";
import { supabase } from "@/lib/supabase";

const CATEGORY_OPTIONS = [
  "General",
  "Lifestyle",
  "Community",
  "Finance",
  "Business",
  "Education",
  "Fun",
  "Politics",
  "Sports",
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

  const hasAny = (terms: string[]) => terms.some((term) => q.includes(term));

  const scores: Record<Exclude<Category, "">, number> = {
    General: 0,
    Lifestyle: 0,
    Community: 0,
    Finance: 0,
    Business: 0,
    Education: 0,
    Fun: 0,
    Politics: 0,
    Sports: 0,
  };

  if (hasAny(["child", "children", "kid", "kids", "parent", "parents", "parenting", "school", "teacher", "teachers", "nursery", "playgroup", "homework", "discipline", "chinuch", "learning", "student", "students", "classroom", "school communication", "privileges"])) {
    scores.Education += 4;
  }

  if (hasAny(["money", "debt", "income", "spending", "afford", "affordability", "salary", "earn", "value", "bills", "saving", "savings", "prices", "price", "cost", "costs", "rent", "mortgage", "tax", "financial", "finance", "split a bill", "splitting a bill", "charity giving"])) {
    scores.Finance += 4;
  }

  if (hasAny(["business", "work", "job", "hiring", "customers", "customer", "pricing", "productivity", "management", "manager", "employee", "employees", "boss", "pay rise", "underpaid", "workplace", "branding", "career", "office"])) {
    scores.Business += 4;
  }

  if (hasAny(["rude", "reply", "message", "cancel", "last minute", "interrupt", "awkward", "manners", "etiquette", "pressure", "social norms", "friend", "friends", "guest", "guests", "invite", "invited", "community", "communal", "neighbour", "neighbor"])) {
    scores.Community += 4;
  }

  if (hasAny(["gym", "sleep", "food", "travel", "airport", "shabbos", "routine", "habit", "habits", "phone", "phones", "screen time", "daily", "morning", "evening", "weekend", "holiday", "eat", "coffee", "exercise", "fitness"])) {
    scores.Lifestyle += 4;
  }

  if (hasAny(["would you rather", "dance", "sing", "cold showers", "air conditioning", "silly", "fun", "absurd", "playful", "movie", "game", "games", "favourite", "favorite"])) {
    scores.Fun += 4;
  }

  if (hasAny(["politics", "political", "government", "prime minister", "president", "election", "vote", "voting", "labour", "conservative", "democrat", "republican", "trump", "biden", "starmer", "sunak", "farage", "israel", "gaza", "ukraine", "russia", "war", "immigration", "tax policy"])) {
    scores.Politics += 4;
  }

  if (hasAny(["sport", "sports", "football", "soccer", "tennis", "cricket", "rugby", "basketball", "baseball", "golf", "boxing", "ufc", "formula 1", "f1", "olympics", "world cup", "super bowl", "premier league", "champions league", "nba", "nfl"])) {
    scores.Sports += 4;
  }

  if (hasAny(["salary", "pay rise", "underpaid", "hiring", "workplace", "manager", "employee", "boss", "customers", "pricing"])) {
    scores.Business += 2;
  }

  if (hasAny(["salary", "earn", "debt", "bills", "afford", "split a bill", "spending", "saving", "savings"])) {
    scores.Finance += 2;
  }

  if (hasAny(["read a message", "not reply", "cancels last minute", "interrupts", "rude"])) {
    scores.Community += 3;
  }

  if (scores.Education > 0 && hasAny(["child", "children", "kid", "kids", "school", "teacher", "parent", "parents", "homework", "discipline"])) {
    return "Education";
  }

  if (scores.Fun > 0 && hasAny(["would you rather", "silly", "absurd", "dance", "sing", "cold showers", "air conditioning"])) {
    return "Fun";
  }

  if (scores.Politics > 0 && hasAny(["politics", "political", "government", "prime minister", "president", "election", "labour", "conservative", "democrat", "republican", "trump", "biden", "starmer", "sunak", "farage", "israel", "gaza", "ukraine", "russia", "immigration"])) {
    return "Politics";
  }

  if (scores.Sports > 0 && hasAny(["sport", "sports", "football", "soccer", "tennis", "cricket", "rugby", "basketball", "baseball", "golf", "boxing", "ufc", "formula 1", "f1", "olympics", "world cup", "super bowl", "premier league", "champions league", "nba", "nfl"])) {
    return "Sports";
  }

  const ranked = CATEGORY_OPTIONS.filter((category) => category !== "General").sort(
    (a, b) => scores[b] - scores[a]
  );

  return scores[ranked[0]] > 0 ? ranked[0] : "General";
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
  const [emailMeLink, setEmailMeLink] = useState(false);
  const [options, setOptions] = useState([createEmptyOption(), createEmptyOption()]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [successData, setSuccessData] = useState<PollCreateResponse | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
const [votesLast24, setVotesLast24] = useState(0);

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
    setEmailMeLink(false);
    setSubmitting(false);
    setMessage("");
    setMessageType("");
    setSuccessData(null);
    setLinkCopied(false);
  };

  const handleQuestionChange = (value: string) => {
    setQuestion(value);
    setCategory(value.trim() ? suggestCategory(value) : "");
  };

const shouldShowEmailField = emailMeLink;

useEffect(() => {
  const loadRecentVotes = async () => {
    try {
      const { data, error } = await supabase.rpc("get_recent_poll_votes");

      if (error) return;

      const total = (data || []).reduce(
        (
          sum: number,
          row: { recent_votes_24h: number | string | null }
        ) => sum + Number(row.recent_votes_24h || 0),
        0
      );

      setVotesLast24(total);
    } catch {
      // ignore recent vote load failures
    }
  };

  void loadRecentVotes();

  const interval = window.setInterval(() => {
    void loadRecentVotes();
  }, 25000);

  return () => {
    window.clearInterval(interval);
  };
}, []);
  const handleCopy = async () => {
    if (!successData) return;

    const textToShare = `${question.trim()}\n\n${successData.pollUrl}`;

    try {
      await navigator.clipboard.writeText(textToShare);
      setLinkCopied(true);
      window.setTimeout(() => {
        setLinkCopied(false);
      }, 1600);
    } catch {
      setMessageType("error");
      setMessage("Could not copy link.");
    }
  };

  const handleShare = async () => {
    if (!successData) return;

    if (navigator.share) {
      try {
        const textToShare = `${question.trim()}\n\n${successData.pollUrl}`;

        await navigator.share({
          text: textToShare,
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

if (emailMeLink && !email.trim()) {
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
email: emailMeLink ? email.trim() : null,
emailMeLink,
  question: question.trim(),
  description: description.trim() || null,
  category: resolvedCategory,
  options: cleanedOptions.map((option) => option.text),
  optionImageUrls: usesImages ? cleanedOptions.map((option) => option.imageUrl) : [],
  isPrivate,
}),
      });

      const rawText = await response.text();
      let data: PollCreateResponse | { error?: string } | null = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error("Server returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error((data && "error" in data && data.error) || "Something went wrong. Please try again.");
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
      <SiteHeader />

      <section className="max-w-3xl mx-auto px-6 pt-1 pb-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold md:text-[3.75rem]">Create a Poll</h1>

          <div className="mt-6 space-y-2">
            <p className="text-[2rem] font-semibold text-white">
              Get your shareable link instantly below
            </p>
            <p className="text-sm text-gray-300 md:text-base">
              Completely free. No sign-up required. Takes seconds.
            </p>
          </div>
        </div>

        <div className="mt-9 bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
          {successData ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-white">Your poll is live! 🎉</h2>
                <p className="text-sm text-gray-300 md:text-base">
                  Share it on WhatsApp or your socials to start getting votes.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="w-full cursor-pointer rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-500 sm:flex-1"
                >
                  {linkCopied ? "Copied ✓" : "Copy link"}
                </button>

                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="w-full cursor-pointer rounded-xl border border-gray-700 bg-gray-900 px-5 py-3 font-medium text-white transition hover:bg-gray-800 sm:flex-1"
                >
                  Share
                </button>

                <Link
                  href={successData.pollUrl}
                  className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-gray-700 bg-gray-900 px-5 py-3 font-medium text-white transition hover:bg-gray-800 sm:flex-1"
                >
                  View poll
                </Link>
              </div>

              <button
                type="button"
                onClick={() => void handleCopy()}
                className="w-full cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-left text-sm text-gray-200 transition hover:bg-gray-800"
                title={successData.pollUrl}
              >
                {linkCopied ? "Copied ✓" : successData.pollUrl}
              </button>

              <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:gap-3">
                <button
                  type="button"
                  onClick={resetPollFields}
                  className="w-full cursor-pointer rounded-xl border border-gray-700 bg-gray-900 px-5 py-3 font-medium text-white transition hover:bg-gray-800 sm:flex-1"
                >
                  Create another poll
                </button>

                <Link
                  href="/"
                  className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-gray-700 bg-gray-900 px-5 py-3 font-medium text-white transition hover:bg-gray-800 sm:flex-1"
                >
                  Back to home
                </Link>
              </div>
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
                    placeholder="e.g. Do you check your phone when you're with other people?"
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
                  <label className={labelClasses}>Poll options (2–6)</label>

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

                <div className="space-y-2">
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
                    Private polls are never shown publicly on Poll & See.
                  </p>

                  <p className="text-xs text-gray-300">
                    Public polls may appear on the Poll & See homepage after review.
                  </p>

                  <label className={checkboxLabelClasses}>
                    <input
                      type="checkbox"
                      checked={emailMeLink}
                      onChange={(e) => setEmailMeLink(e.target.checked)}
                      className={checkboxClasses}
                    />
                    <span>Email me if my poll goes live on the homepage</span>
                  </label>

                  {shouldShowEmailField ? (
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                      className={inputClasses}
                    />
                  ) : null}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-gray-400">
                    Polls may be edited for clarity, spelling, or shareability, and removed if they don't meet our{" "}
                    <Link href="/guidelines" className="text-blue-300 hover:underline">
                      guidelines
                    </Link>.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mx-auto mt-1 block rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60 sm:mx-0 sm:inline-block"
                >
                  {submitting ? "Creating..." : "Create poll & get my link"}
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

      <ActivityIndicator votesLast24={votesLast24} />
    </main>
  );
}