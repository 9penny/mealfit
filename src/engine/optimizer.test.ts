import { describe, expect, it } from 'vitest'
import type { Food, Meal, Request, Result } from '../domain/types'
import { solve } from './optimizer'
import { totals } from './nutrition'

// Synthetic serving grids make expected sums, infeasibility, and tie-breaks explicit.
function fixture(id: string, role: Food['role'], per100: Food['per100'], patch: Partial<Food> = {}): Food {
  return { id, name: id, role, per100, basis: 'test', zeroCook: true, allergens: [],
    minG: 50, maxG: 200, stepG: 25, cost: 1, source: 'test', notes: '', ...patch }
}
const fixed = { minG: 100, maxG: 100 }
const carb = fixture('carb', 'carb', { kcal: 150, protein: 5 })
const lean = fixture('lean', 'protein', { kcal: 100, protein: 25, fat: 1 })
const rich = fixture('rich', 'protein', { kcal: 220, protein: 18, fat: 17 })
const greens = fixture('greens', 'extra', { kcal: 50, protein: 2, vitaminC: 15, fiber: 3 })
const foods = [carb, lean, rich, greens]
const req: Request = { slot: 'lunch', carbId: 'carb', proteinId: 'lean', mealsLeft: 2,
  targets: { kcal: 900, protein: 80 }, prefs: { zeroCook: true, excludeIds: [], allergens: [] }, saved: [] }
function success(r: Result) { if (!r.ok) throw Error(r.message); return r }
function failure(r: Result) { if (r.ok) throw Error('Expected an actionable error'); return r.message }
const measure = (m: Meal) => totals(m.portions, foods)

describe('solve', () => {
  it('keeps the selected bases, adds an explained complement, and reports unknowns', () => {
    const r = success(solve(req, foods))
    expect(r.meal.portions.map(p => p.foodId)).toEqual(['carb', 'lean', 'greens'])
    expect(r.meal.portions[2].reason).toMatch(/维生素 C|膳食纤维/)
    expect(r.notes.join('')).toContain('数据不全')
    for (const p of r.meal.portions) {
      const f = foods.find(i => i.id === p.foodId)!
      expect(p.grams).toBeGreaterThanOrEqual(f.minG)
      expect(p.grams).toBeLessThanOrEqual(f.maxG)
      expect((p.grams - f.minG) % f.stepG).toBe(0)
    }
  })
  it('is reproducible even if catalog order changes or candidates tie', () => {
    const tied = [...foods, { ...greens, id: 'greens2' }]
    expect(solve(req, tied)).toEqual(solve(req, [...tied].reverse()))
    expect(solve(req, tied)).toEqual(solve(req, tied))
  })
  it('never returns excluded, allergenic, or cooking-required foods', () => {
    const bad = [ { ...greens, id: 'allergen', allergens: ['nuts'] }, { ...greens, id: 'cook', zeroCook: false } ]
    const constrained = { ...req, prefs: { zeroCook: true, excludeIds: ['greens'], allergens: ['nuts'] } }
    const r = success(solve(constrained, [...foods, ...bad]))
    expect(r.meal.portions.map(p => p.foodId)).toEqual(['carb', 'lean'])
    expect(failure(solve(constrained, [{ ...carb, allergens: ['nuts'] }, lean]))).toMatch(/过敏原/)
    expect(failure(solve(constrained, [carb, { ...lean, zeroCook: false }]))).toMatch(/即食/)
    expect(failure(solve({ ...req, prefs: { ...req.prefs, excludeIds: ['lean'] } }, foods))).toMatch(/排除/)
  })
  it('reserves saved meals and swaps only the requested protein', () => {
    const saved = [success(solve({ ...req, slot: 'breakfast' }, foods)).meal]
    const before = JSON.stringify(saved)
    const common = { ...req, saved, mealsLeft: 1 }
    const a = success(solve(common, foods)).meal
    const b = success(solve({ ...common, proteinId: 'rich' }, foods)).meal
    expect(a.proteinId).toBe('lean'); expect(b.proteinId).toBe('rich')
    expect(b.carbId).toBe(a.carbId)
    expect(measure(a).kcal! + measure(saved[0]).kcal!).toBeLessThanOrEqual(req.targets.kcal)
    expect(measure(b).kcal! + measure(saved[0]).kcal!).toBeLessThanOrEqual(req.targets.kcal)
    expect(JSON.stringify(saved)).toBe(before)
  })
  it('reports the real fat and energy delta after a higher-fat primary swap', () => {
    const items = [ { ...carb, ...fixed, per100: { ...carb.per100, fat: 0 } },
      { ...lean, ...fixed }, { ...rich, ...fixed } ]
    const a = totals(success(solve(req, items)).meal.portions, items)
    const b = totals(success(solve({ ...req, proteinId: 'rich' }, items)).meal.portions, items)
    expect(b.fat! - a.fat!).toBe(16)
    expect(b.kcal! - a.kcal!).toBe(120)
    expect(b.b12).toBeNull()
  })
  it('uses remaining meal count and does not impose a fixed equal-split cap', () => {
    const one = success(solve({ ...req, mealsLeft: 1 }, foods)).meal
    const three = success(solve({ ...req, mealsLeft: 3 }, foods)).meal
    expect(measure(one).kcal!).toBeGreaterThan(measure(three).kcal!)
    const tiny = { ...req, mealsLeft: 4, targets: { kcal: 130, protein: 20 } }
    expect(measure(success(solve(tiny, foods)).meal).kcal).toBe(125)
  })
  it('explains missing primary macros, invalid choices, and invalid serving grids', () => {
    expect(failure(solve(req, [carb, { ...lean, per100: { kcal: 100 } }]))).toMatch(/数据/)
    expect(failure(solve({ ...req, carbId: 'lean' }, foods))).toMatch(/主食/)
    expect(failure(solve(req, [{ ...carb, stepG: 0 }, lean]))).toMatch(/份量/)
    expect(failure(solve(req, [{ ...carb, minG: 0, maxG: 1, stepG: 10 }, lean]))).toMatch(/步长/)
    expect(failure(solve({ ...req, mealsLeft: 0 }, foods))).toMatch(/餐数/)
  })
  it('explains exhausted, too-small, and unknown remaining budgets', () => {
    const saved = [success(solve(req, foods)).meal]
    expect(failure(solve({ ...req, saved, targets: { kcal: 30, protein: 10 } }, foods))).toMatch(/剩余/)
    expect(failure(solve({ ...req, targets: { kcal: 30, protein: 10 } }, foods))).toMatch(/最小份量/)
    const stale = { ...saved[0], portions: [{ foodId: 'removed', grams: 20, reason: '' }] }
    expect(failure(solve({ ...req, saved: [stale] }, foods))).toMatch(/已保存/)
  })
  it('keeps the selected protein when the daily goal is already met', () => {
    const saved = [success(solve(req, foods)).meal]
    const r = success(solve({ ...req, saved, targets: { kcal: 1200, protein: 5 } }, foods))
    expect(r.meal.portions[1].foodId).toBe('lean')
    expect(r.notes.join('')).toMatch(/已达到当日蛋白质目标/)
  })
  it('uses daily documented contributions to break ties between complements', () => {
    const shared = { kcal: 50, protein: 0, fiber: 0, vitaminC: 0 }
    const grain = fixture('carb', 'carb', shared, fixed), meat = fixture('lean', 'protein', shared, fixed)
    const highC = fixture('c', 'extra', { ...shared, vitaminC: 50 }, fixed)
    const highFiber = fixture('fiber', 'extra', { ...shared, fiber: 8 }, fixed)
    const saved: Meal = { slot: 'breakfast', carbId: '', proteinId: '', portions: [{ foodId: 'c', grams: 100, reason: '' }] }
    const result = success(solve({ ...req, saved: [saved], targets: { kcal: 200, protein: 0 }, mealsLeft: 1 }, [grain, meat, highC, highFiber]))
    expect(result.meal.portions.map(p => p.foodId)).toEqual(['carb', 'lean', 'fiber'])
  })
  it('bounds search even when portion increments and catalog size are extreme', () => {
    const big = Array.from({ length: 100 }, (_, i) => ({ ...greens, id: `g${i}`, maxG: 10000, stepG: 0.0001 }))
    const result = success(solve(req, [carb, lean, ...big]))
    expect(result.meal.portions.length).toBeLessThanOrEqual(4)
    expect(result.meal.portions.every(p => Number.isFinite(p.grams))).toBe(true)
  })
})
