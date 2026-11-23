import { describe, expect, it } from 'vitest'
import { nutrients, type Food, type Meal } from '../domain/types'
import { totals } from './nutrition'
import { budget } from './budget'

// Artificial records for arithmetic; not entries in the published food catalog.
const food: Food = {
  id: 'fixture', name: '样本', role: 'carb', basis: 'test', zeroCook: true,
  allergens: [], minG: 1, maxG: 200, stepG: 1, cost: 1, source: 'test', notes: '',
  per100: { kcal: 120, protein: 6, calcium: 0, vitaminD: null, iron: 0.4 },
}
const portion = (grams: number, foodId = food.id) => ({ grams, foodId, reason: 'test' })
const meal = (grams: number): Meal => ({ slot: 'lunch', carbId: food.id, proteinId: '', portions: [portion(grams)] })

describe('totals', () => {
  it('scales per 100 g, sums repeated portions, and preserves unrounded trace units', () => {
    const t = totals([portion(12.5), portion(25)], [food])
    expect(t.kcal).toBe(45)
    expect(t.protein).toBe(2.25)
    expect(t.iron).toBeCloseTo(0.15, 12)
    expect(t.calcium).toBe(0)
    expect(t.vitaminD).toBeNull()
    expect(t.b12).toBeNull()
  })
  it('returns every nutrient; an empty or zero-weight meal contributes zero', () => {
    const zero = Object.fromEntries(nutrients.map(n => [n, 0]))
    expect(totals([], [])).toEqual(zero)
    expect(totals([portion(0, 'removed')], [])).toEqual(zero)
  })
  it('propagates incomplete and nonfinite composition independently by nutrient', () => {
    const other = { ...food, id: 'other', per100: { kcal: 40, protein: Infinity } }
    const t = totals([portion(100, 'other'), portion(50)], [food, other])
    expect(t.kcal).toBe(100)
    expect(t.protein).toBeNull()
    expect(t.calcium).toBeNull()
    expect(Object.values(totals([portion(1, 'removed')], [food])).every(x => x === null)).toBe(true)
  })
  it.each([-1, Infinity, NaN])('rejects invalid portion weight %s', grams => {
    expect(() => totals([portion(grams)], [food])).toThrow(RangeError)
  })
})

describe('budget', () => {
  it('sums saved meals exactly and keeps signed residuals', () => {
    const targets = { kcal: 200, protein: 4 }
    expect(budget([meal(100), meal(75)], targets, [food])).toEqual({
      used: { kcal: 210, protein: 10.5 }, remaining: { kcal: -10, protein: -6.5 },
    })
    expect(budget([], targets, [food])).toEqual({ used: { kcal: 0, protein: 0 }, remaining: targets })
  })
  it('does not silently undercount meals with unknown kcal/protein', () => {
    expect(() => budget([meal(10)], { kcal: 200, protein: 4 }, [])).toThrow(/已保存/)
  })
})
