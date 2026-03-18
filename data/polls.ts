export type Poll = {
  id: number;
  question: string;
  description: string;
  votes: number;
  category: string;
};

export const polls: Poll[] = [
  {
    id: 1,
    question: "Would you pay £25 for this product?",
    description: "A simple pricing test to see how people respond before launching more widely.",
    votes: 101,
    category: "Business",
  },
  {
    id: 2,
    question: "Should schools reduce homework?",
    description: "A general community question around pressure, learning, and balance.",
    votes: 232,
    category: "Education",
  },
  {
    id: 3,
    question: "Should communal funds cover this expense?",
    description: "A question around expectations, fairness, and public support.",
    votes: 87,
    category: "Community",
  },
];