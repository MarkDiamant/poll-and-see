export const CATEGORY_OPTIONS = [
  "Business",
  "Community",
  "Education",
  "Finance",
  "Food",
  "Fun",
  "General",
  "Health",
  "Lifestyle",
  "Parenting",
  "Politics",
  "Sports",
  "Technology",
] as const;

export type CategoryOption = (typeof CATEGORY_OPTIONS)[number];

export const SIGNUP_CATEGORIES = CATEGORY_OPTIONS;

export const LIVE_POLL_CATEGORIES = SIGNUP_CATEGORIES;

export const OPTION_COLOURS = ["#2563eb", "#22c55e", "#fbbf24", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#ef4444"];

export const RELATED_CATEGORY_ORDER: Record<string, string[]> = {
  Business: ["Finance", "Technology", "Community", "General", "Politics", "Lifestyle", "Education", "Food", "Parenting", "Health", "Fun", "Sports"],
  Community: ["Lifestyle", "General", "Parenting", "Education", "Fun", "Politics", "Finance", "Business", "Food", "Health", "Technology", "Sports"],
  Education: ["Parenting", "Community", "Lifestyle", "General", "Fun", "Technology", "Politics", "Finance", "Business", "Health", "Food", "Sports"],
  Finance: ["Business", "Lifestyle", "General", "Community", "Politics", "Education", "Technology", "Parenting", "Food", "Health", "Fun", "Sports"],
  Food: ["Lifestyle", "Health", "Community", "Parenting", "Fun", "General", "Business", "Education", "Finance", "Sports", "Politics", "Technology"],
  Fun: ["General", "Lifestyle", "Community", "Sports", "Food", "Parenting", "Education", "Health", "Finance", "Business", "Technology", "Politics"],
  General: ["Community", "Lifestyle", "Fun", "Parenting", "Education", "Politics", "Finance", "Business", "Food", "Health", "Technology", "Sports"],
  Health: ["Lifestyle", "Food", "Parenting", "General", "Community", "Education", "Finance", "Fun", "Business", "Sports", "Technology", "Politics"],
  Lifestyle: ["Community", "General", "Food", "Health", "Parenting", "Fun", "Finance", "Sports", "Education", "Business", "Technology", "Politics"],
  Parenting: ["Education", "Community", "Lifestyle", "Health", "Food", "General", "Fun", "Finance", "Business", "Technology", "Politics", "Sports"],
  Politics: ["Community", "General", "Business", "Finance", "Education", "Technology", "Lifestyle", "Parenting", "Health", "Food", "Fun", "Sports"],
  Sports: ["Community", "Fun", "General", "Lifestyle", "Health", "Food", "Education", "Business", "Finance", "Technology", "Parenting", "Politics"],
  Technology: ["Business", "Education", "General", "Lifestyle", "Finance", "Community", "Politics", "Fun", "Parenting", "Health", "Food", "Sports"],
};

export const CATEGORY_COLOURS: Record<string, { text: string; bg: string; border: string; solid: string }> = {
  All: { text: "#e5e7eb", bg: "rgba(31, 41, 55, 0.9)", border: "rgba(75, 85, 99, 1)", solid: "#374151" },
  Business: { text: "#bfdbfe", bg: "rgba(37, 99, 235, 0.16)", border: "rgba(37, 99, 235, 0.7)", solid: "#2563eb" },
  Community: { text: "#fecaca", bg: "rgba(185, 28, 28, 0.16)", border: "rgba(185, 28, 28, 0.75)", solid: "#b91c1c" },
  Education: { text: "#f5e7c4", bg: "rgba(120, 53, 15, 0.18)", border: "rgba(180, 83, 9, 0.7)", solid: "#92400e" },
  Finance: { text: "#bbf7d0", bg: "rgba(20, 83, 45, 0.2)", border: "rgba(22, 163, 74, 0.75)", solid: "#14532d" },
  Food: { text: "#ccfbf1", bg: "rgba(15, 118, 110, 0.18)", border: "rgba(20, 184, 166, 0.75)", solid: "#0f766e" },
  Fun: { text: "#fbcfe8", bg: "rgba(219, 39, 119, 0.18)", border: "rgba(236, 72, 153, 0.75)", solid: "#db2777" },
  General: { text: "#bae6fd", bg: "rgba(14, 165, 233, 0.16)", border: "rgba(14, 165, 233, 0.7)", solid: "#0ea5e9" },
  Health: { text: "#fed7aa", bg: "rgba(249, 115, 22, 0.16)", border: "rgba(249, 115, 22, 0.7)", solid: "#f97316" },
  Lifestyle: { text: "#e9d5ff", bg: "rgba(109, 40, 217, 0.18)", border: "rgba(139, 92, 246, 0.75)", solid: "#6d28d9" },
  Parenting: { text: "#dbeafe", bg: "rgba(30, 58, 138, 0.16)", border: "rgba(96, 165, 250, 0.72)", solid: "#1e3a8a" },
  Politics: { text: "#fef9c3", bg: "rgba(250, 204, 21, 0.20)", border: "rgba(250, 204, 21, 0.85)", solid: "#eab308" },
  Sports: { text: "#d9f99d", bg: "rgba(132, 204, 22, 0.14)", border: "rgba(132, 204, 22, 0.60)", solid: "#84cc16" },
  Technology: { text: "#f5d0fe", bg: "rgba(168, 85, 247, 0.16)", border: "rgba(192, 132, 252, 0.7)", solid: "#a855f7" },
  Tech: { text: "#f5d0fe", bg: "rgba(168, 85, 247, 0.16)", border: "rgba(192, 132, 252, 0.7)", solid: "#a855f7" },
};

export const FALLBACK_CATEGORY_COLOURS = [
  CATEGORY_COLOURS.Business,
  CATEGORY_COLOURS.Community,
  CATEGORY_COLOURS.Education,
  CATEGORY_COLOURS.Finance,
  CATEGORY_COLOURS.Food,
  CATEGORY_COLOURS.Fun,
  CATEGORY_COLOURS.General,
  CATEGORY_COLOURS.Health,
  CATEGORY_COLOURS.Lifestyle,
  CATEGORY_COLOURS.Parenting,
  CATEGORY_COLOURS.Politics,
  CATEGORY_COLOURS.Sports,
  CATEGORY_COLOURS.Technology,
];

export const EMAIL_CATEGORY_COLOURS: Record<string, { text: string; bg: string; border: string }> = {
  All: { text: "#e5e7eb", bg: "#1f2937", border: "#4b5563" },
  Business: { text: "#bfdbfe", bg: "#102a63", border: "#2563eb" },
  Community: { text: "#fecaca", bg: "#3a0d0d", border: "#b91c1c" },
  Education: { text: "#f5e7c4", bg: "#3a2412", border: "#92400e" },
  Finance: { text: "#bbf7d0", bg: "#052e16", border: "#16a34a" },
  Food: { text: "#ccfbf1", bg: "#042f2e", border: "#0f766e" },
  Fun: { text: "#fbcfe8", bg: "#4a0f2c", border: "#db2777" },
  General: { text: "#bae6fd", bg: "#083344", border: "#0ea5e9" },
  Health: { text: "#fed7aa", bg: "#431407", border: "#f97316" },
  Lifestyle: { text: "#e9d5ff", bg: "#2e1065", border: "#6d28d9" },
  Parenting: { text: "#dbeafe", bg: "#172554", border: "#1e3a8a" },
  Politics: { text: "#fef9c3", bg: "#422006", border: "#eab308" },
  Sports: { text: "#d9f99d", bg: "#243607", border: "#84cc16" },
  Technology: { text: "#f5d0fe", bg: "#3b0764", border: "#a855f7" },
  Tech: { text: "#f5d0fe", bg: "#3b0764", border: "#a855f7" },
};

export const FALLBACK_EMAIL_CATEGORY_COLOURS = [
  EMAIL_CATEGORY_COLOURS.Business,
  EMAIL_CATEGORY_COLOURS.Community,
  EMAIL_CATEGORY_COLOURS.Education,
  EMAIL_CATEGORY_COLOURS.Finance,
  EMAIL_CATEGORY_COLOURS.Food,
  EMAIL_CATEGORY_COLOURS.Fun,
  EMAIL_CATEGORY_COLOURS.General,
  EMAIL_CATEGORY_COLOURS.Health,
  EMAIL_CATEGORY_COLOURS.Lifestyle,
  EMAIL_CATEGORY_COLOURS.Parenting,
  EMAIL_CATEGORY_COLOURS.Politics,
  EMAIL_CATEGORY_COLOURS.Sports,
  EMAIL_CATEGORY_COLOURS.Technology,
];

export function getEmailCategoryColours(category: string) {
  const trimmed = category?.trim();

  if (!trimmed) return EMAIL_CATEGORY_COLOURS.All;

  if (EMAIL_CATEGORY_COLOURS[trimmed]) {
    return EMAIL_CATEGORY_COLOURS[trimmed];
  }

  let hash = 0;

  for (let i = 0; i < trimmed.length; i += 1) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
  }

  return FALLBACK_EMAIL_CATEGORY_COLOURS[Math.abs(hash) % FALLBACK_EMAIL_CATEGORY_COLOURS.length];
}

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
    Business: 0,
    Community: 0,
    Education: 0,
    Finance: 0,
    Food: 0,
    Fun: 0,
    General: 0,
    Health: 0,
    Lifestyle: 0,
    Parenting: 0,
    Politics: 0,
    Sports: 0,
    Technology: 0,
  };

  if (hasAny(["child", "children", "kid", "kids", "parent", "parents", "parenting", "bedtime", "bedtimes", "discipline", "screen time", "school run"])) {
    scores.Parenting += 5;
  }

  if (hasAny(["school", "teacher", "teachers", "nursery", "playgroup", "homework", "chinuch", "learning", "student", "students", "classroom", "school communication", "privileges"])) {
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

  if (hasAny(["food", "lunch", "supper", "dinner", "breakfast", "sandwich", "sandwiches", "snack", "snacks", "school lunch", "hot lunch", "cake", "restaurant", "takeaway", "eating", "eat"])) {
    scores.Food += 4;
  }

  if (hasAny(["health", "healthy", "doctor", "dentist", "medical", "medicine", "exercise", "fitness", "gym", "sleep", "diet", "wellbeing", "wellness", "mental health"])) {
    scores.Health += 4;
  }

  if (hasAny(["travel", "airport", "shabbos", "routine", "habit", "habits", "phone", "phones", "daily", "morning", "evening", "weekend", "holiday", "coffee"])) {
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

  if (hasAny(["technology", "tech", "ai", "artificial intelligence", "app", "apps", "software", "phone", "smartphone", "internet", "online", "website", "screen", "device", "devices", "laptop", "computer", "social media"])) {
    scores.Technology += 4;
  }

  const ranked = CATEGORY_OPTIONS
    .filter((category) => category !== "General")
    .sort((a, b) => scores[b] - scores[a]);

  return scores[ranked[0]] > 0 ? ranked[0] : "General";
}