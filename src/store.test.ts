import { expect, it } from "vitest";
import { foods, DATA_VERSION } from "./data/foods";
import { fresh, restore } from "./store";
import type { Meal } from "./domain/types";
const today = "2026-11-20";
const j = fresh(today, DATA_VERSION);
const m: Meal = {
  slot: "lunch",
  carbId: "rice",
  proteinId: "egg",
  portions: [
    { foodId: "rice", grams: 100, reason: "主食" },
    { foodId: "egg", grams: 50, reason: "蛋白质" },
  ],
};
const saved = { ...j, saved: [m], targets: { kcal: 1900, protein: 85 } };
const load = (data: unknown, day = today, version = DATA_VERSION) =>
  restore(JSON.stringify(data), day, version, foods);
it("round-trips saved portions and target changes", () =>
  expect(load(saved).journal).toEqual(saved));
it("starts a new day without discarding targets", () => {
  const r = load(saved, "2026-11-21");
  expect(r.journal.saved).toEqual([]);
  expect(r.journal.targets).toEqual(saved.targets);
});
it("does not silently recompute old meals under a new dataset", () => {
  const r = load(saved, today, "vNext");
  expect(r.journal.saved).toEqual([]);
  expect(r.notice).toContain("已更新");
});
it("rejects invalid portions, duplicated slots and corrupted JSON", () => {
  for (const bad of [
    { ...saved, saved: [m, m] },
    { ...saved, saved: [{ ...m, portions: [] }] },
    {
      ...saved,
      saved: [{ ...m, portions: [{ foodId: "rice", grams: -1, reason: "" }] }],
    },
  ]) {
    expect(load(bad).notice).not.toBe("");
    expect(load(bad).journal.saved).toEqual([]);
  }
  expect(restore("{", today, DATA_VERSION, foods).journal).toEqual(j);
});
it("rejects foods with negative kcal or protein via known() semantics", () => {
  const badFoods = foods.map((f) =>
    f.id === "rice" ? { ...f, per100: { ...f.per100, kcal: -10 } } : f,
  );
  const res = restore(JSON.stringify(saved), today, DATA_VERSION, badFoods);
  expect(res.notice).not.toBe("");
  expect(res.journal.saved).toEqual([]);
});
