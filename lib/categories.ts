export const CATEGORY_OPTIONS = [
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

export type CategoryOption = (typeof CATEGORY_OPTIONS)[number];

export const SIGNUP_CATEGORIES = [
  "Business",
  "Community",
  "Education",
  "Finance",
  "Fun",
  "General",
  "Lifestyle",
  "Politics",
  "Sports",
];

export const LIVE_POLL_CATEGORIES = SIGNUP_CATEGORIES;

export const OPTION_COLOURS = ["#2563eb", "#22c55e", "#fbbf24", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#ef4444"];

export const RELATED_CATEGORY_ORDER: Record<string, string[]> = {
  Community: ["Lifestyle", "General", "Education", "Fun", "Politics", "Finance", "Business", "Sports"],
  Lifestyle: ["Community", "General", "Fun", "Finance", "Sports", "Education", "Business", "Politics"],
  General: ["Community", "Lifestyle", "Fun", "Education", "Politics", "Finance", "Business", "Sports"],
  Fun: ["General", "Lifestyle", "Community", "Sports", "Education", "Finance", "Business", "Politics"],
  Finance: ["Business", "Lifestyle", "General", "Community", "Politics", "Education", "Fun", "Sports"],
  Business: ["Finance", "Community", "General", "Politics", "Lifestyle", "Education", "Fun", "Sports"],
  Education: ["Community", "Lifestyle", "General", "Fun", "Politics", "Finance", "Business", "Sports"],
  Sports: ["Community", "Fun", "General", "Lifestyle", "Education", "Business", "Finance", "Politics"],
  Politics: ["Community", "General", "Business", "Finance", "Education", "Lifestyle", "Fun", "Sports"],
};

export const CATEGORY_COLOURS: Record<string, { text: string; bg: string; border: string; solid: string }> = {
  All: {
    text: "#e5e7eb",
    bg: "rgba(31, 41, 55, 0.9)",
    border: "rgba(75, 85, 99, 1)",
    solid: "#374151",
  },

  Business: {
    text: "#bfdbfe",
    bg: "rgba(29, 78, 216, 0.14)",
    border: "rgba(37, 99, 235, 0.65)",
    solid: "#1d4ed8",
  },

  Community: {
    text: "#f87171",
    bg: "rgba(185, 28, 28, 0.14)",
    border: "rgba(185, 28, 28, 0.65)",
    solid: "#b91c1c",
  },

  Education: {
    text: "#fed7aa",
    bg: "rgba(234, 88, 12, 0.14)",
    border: "rgba(249, 115, 22, 0.65)",
    solid: "#ea580c",
  },

  Finance: {
    text: "#bbf7d0",
    bg: "rgba(20, 83, 45, 0.16)",
    border: "rgba(22, 101, 52, 0.70)",
    solid: "#14532d",
  },

  Fun: {
    text: "#fbcfe8",
    bg: "rgba(219, 39, 119, 0.15)",
    border: "rgba(236, 72, 153, 0.70)",
    solid: "#db2777",
  },

  General: {
    text: "#bae6fd",
    bg: "rgba(14, 165, 233, 0.14)",
    border: "rgba(56, 189, 248, 0.60)",
    solid: "#0ea5e9",
  },

  Lifestyle: {
    text: "#e9d5ff",
    bg: "rgba(107, 33, 168, 0.16)",
    border: "rgba(126, 34, 206, 0.70)",
    solid: "#6b21a8",
  },

  Health: {
    text: "#fdba74",
    bg: "rgba(249, 115, 22, 0.12)",
    border: "rgba(249, 115, 22, 0.55)",
    solid: "#f97316",
  },

  Politics: {
    text: "#fef3c7",
    bg: "rgba(202, 138, 4, 0.14)",
    border: "rgba(234, 179, 8, 0.65)",
    solid: "#ca8a04",
  },

  Sports: {
    text: "#d9f99d",
    bg: "rgba(132, 204, 22, 0.14)",
    border: "rgba(132, 204, 22, 0.60)",
    solid: "#84cc16",
  },

  Tech: {
    text: "#f9a8d4",
    bg: "rgba(217, 70, 239, 0.12)",
    border: "rgba(217, 70, 239, 0.55)",
    solid: "#d946ef",
  },
};

export const FALLBACK_CATEGORY_COLOURS = [
  { text: "#bfdbfe", bg: "rgba(29, 78, 216, 0.14)", border: "rgba(37, 99, 235, 0.65)", solid: "#1d4ed8" },
  { text: "#f87171", bg: "rgba(185, 28, 28, 0.14)", border: "rgba(185, 28, 28, 0.65)", solid: "#b91c1c" },
  { text: "#fed7aa", bg: "rgba(234, 88, 12, 0.14)", border: "rgba(249, 115, 22, 0.65)", solid: "#ea580c" },
  { text: "#bbf7d0", bg: "rgba(20, 83, 45, 0.16)", border: "rgba(22, 101, 52, 0.70)", solid: "#14532d" },
  { text: "#bae6fd", bg: "rgba(14, 165, 233, 0.14)", border: "rgba(56, 189, 248, 0.60)", solid: "#0ea5e9" },
  { text: "#e9d5ff", bg: "rgba(107, 33, 168, 0.16)", border: "rgba(126, 34, 206, 0.70)", solid: "#6b21a8" },
  { text: "#fef3c7", bg: "rgba(202, 138, 4, 0.14)", border: "rgba(234, 179, 8, 0.65)", solid: "#ca8a04" },
  { text: "#d9f99d", bg: "rgba(132, 204, 22, 0.14)", border: "rgba(132, 204, 22, 0.60)", solid: "#84cc16" },
  { text: "#fbcfe8", bg: "rgba(219, 39, 119, 0.15)", border: "rgba(236, 72, 153, 0.70)", solid: "#db2777" },
  { text: "#f9a8d4", bg: "rgba(217, 70, 239, 0.12)", border: "rgba(217, 70, 239, 0.55)", solid: "#d946ef" },
];

export function getOptionColour(index: number) {
  return OPTION_COLOURS[index] || OPTION_COLOURS[OPTION_COLOURS.length - 1];
}

export function getCategoryColours(category: string) {
  const trimmed = category?.trim();

  if (!trimmed) return CATEGORY_COLOURS.All;

  if (CATEGORY_COLOURS[trimmed]) {
    return CATEGORY_COLOURS[trimmed];
  }

  let hash = 0;

  for (let i = 0; i < trimmed.length; i += 1) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
  }

  return FALLBACK_CATEGORY_COLOURS[Math.abs(hash) % FALLBACK_CATEGORY_COLOURS.length];
}

export function getPriorityCategories(anchorCategory: string) {
  const related = RELATED_CATEGORY_ORDER[anchorCategory] || [];
  return [anchorCategory, ...related];
}

export function suggestCategoryFromQuestion(question: string): CategoryOption {
  const q = question.toLowerCase().trim();

  if (!q) return "General";

  const hasAny = (terms: string[]) => terms.some((term) => q.includes(term));

  const scores: Record<CategoryOption, number> = {
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

  const ranked = CATEGORY_OPTIONS
    .filter((category) => category !== "General")
    .sort((a, b) => scores[b] - scores[a]);

  return scores[ranked[0]] > 0 ? ranked[0] : "General";
}