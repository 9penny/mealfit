import {
  nutrients,
  type Food,
  type Meal,
  type MealSlot,
  type Preferences,
  type Targets,
} from "./domain/types";
export const STORE_KEY = "mealfit:journal:v1";
export const slots: MealSlot[] = ["breakfast", "lunch", "dinner", "custom"];
export type Journal = {
  day: string;
  dataVersion: string;
  targets: Targets;
  prefs: Preferences;
  saved: Meal[];
};
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function fresh(day: string, dataVersion: string): Journal {
  return {
    day,
    dataVersion,
    targets: { kcal: 1800, protein: 120 },
    prefs: { zeroCook: true, excludeIds: [], allergens: [] },
    saved: [],
  };
}
const rec = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const positive = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 0;
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((i) => typeof i === "string");
export function restore(
  raw: string | null,
  day: string,
  version: string,
  foods: Food[],
): { journal: Journal; notice: string } {
  const base = fresh(day, version),
    defaults = { journal: base, notice: "" };
  if (!raw) return defaults;
  try {
    const x: unknown = JSON.parse(raw);
    if (
      !rec(x) ||
      !rec(x.targets) ||
      !rec(x.prefs) ||
      !positive(x.targets.kcal) ||
      !positive(x.targets.protein) ||
      typeof x.prefs.zeroCook !== "boolean" ||
      !strings(x.prefs.excludeIds) ||
      !strings(x.prefs.allergens) ||
      typeof x.day !== "string" ||
      !Array.isArray(x.saved)
    )
      throw Error();
    base.targets = { kcal: x.targets.kcal, protein: x.targets.protein };
    base.prefs = {
      zeroCook: x.prefs.zeroCook,
      excludeIds: x.prefs.excludeIds,
      allergens: x.prefs.allergens,
    };
    if (x.day !== day) return defaults;
    if (x.dataVersion !== version)
      return {
        journal: base,
        notice: "食物数据已更新，请用新版数据重新配餐。",
      };
    const ids = new Set<MealSlot>();
    const byId = new Map(foods.map((f) => [f.id, f]));
    const saved: Meal[] = [];
    for (const m of x.saved) {
      if (
        !rec(m) ||
        !slots.includes(m.slot as MealSlot) ||
        ids.has(m.slot as MealSlot) ||
        typeof m.carbId !== "string" ||
        byId.get(m.carbId)?.role !== "carb" ||
        typeof m.proteinId !== "string" ||
        byId.get(m.proteinId)?.role !== "protein" ||
        !Array.isArray(m.portions)
      )
        throw Error();
      const portions: Meal["portions"] = [];
      for (const p of m.portions) {
        if (
          !rec(p) ||
          typeof p.foodId !== "string" ||
          typeof p.reason !== "string" ||
          !positive(p.grams)
        )
          throw Error();
        const f = byId.get(p.foodId);
        if (
          !f ||
          p.grams < f.minG ||
          p.grams > f.maxG ||
          !nutrients.slice(0, 2).every((k) => Number.isFinite(f.per100[k])) ||
          portions.some((i) => i.foodId === p.foodId)
        )
          throw Error();
        portions.push({ foodId: p.foodId, grams: p.grams, reason: p.reason });
      }
      if (
        ![m.carbId, m.proteinId].every((id) =>
          portions.some((p) => p.foodId === id),
        )
      )
        throw Error();
      ids.add(m.slot as MealSlot);
      saved.push({
        slot: m.slot as MealSlot,
        carbId: m.carbId,
        proteinId: m.proteinId,
        portions,
      });
    }
    return { journal: { ...base, saved }, notice: "" };
  } catch {
    return {
      journal: base,
      notice: "本地记录格式异常，已恢复可用的设置；请重新生成今日餐单。",
    };
  }
}
