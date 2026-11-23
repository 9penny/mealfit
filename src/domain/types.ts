export const nutrients = [
  "kcal",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "calcium",
  "iron",
  "sodium",
  "vitaminC",
  "vitaminD",
  "b12",
  "omega3",
] as const;
export type Nutrient = (typeof nutrients)[number];
export type Food = {
  id: string;
  name: string;
  role: "carb" | "protein" | "extra";
  basis: string;
  zeroCook: boolean;
  allergens: string[];
  minG: number;
  maxG: number;
  stepG: number;
  cost: 1 | 2 | 3;
  source: string;
  notes: string;
  per100: Partial<Record<Nutrient, number | null>>;
};
export type MealSlot = "breakfast" | "lunch" | "dinner" | "custom";
export type Portion = { foodId: string; grams: number; reason: string };
export type Meal = {
  slot: MealSlot;
  carbId: string;
  proteinId: string;
  portions: Portion[];
};
export type Targets = { kcal: number; protein: number };
export type Preferences = {
  zeroCook: boolean;
  excludeIds: string[];
  allergens: string[];
};
export type Request = {
  slot: MealSlot;
  carbId: string;
  proteinId: string;
  mealsLeft: number;
  targets: Targets;
  prefs: Preferences;
  saved: Meal[];
};
export type Result =
  | { ok: true; meal: Meal; notes: string[] }
  | { ok: false; message: string };
