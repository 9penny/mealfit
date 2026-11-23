import { describe, expect, it } from 'vitest'
import { nutrients } from '../domain/types'
import { DATA_VERSION, foods } from './foods'

const get = (id: string) => {
  const food = foods.find(f => f.id === id)
  if (!food) throw new Error(`Missing starter food: ${id}`)
  return food
}

describe('curated food catalog', () => {
  it('uses unique IDs, explicit nutrient coverage, record-level sources and valid serving grids', () => {
    expect(DATA_VERSION).toContain('sr-legacy.2018-04')
    expect(new Set(foods.map(f => f.id)).size).toBe(foods.length)
    for (const f of foods) {
      expect(f.source).toMatch(/^https:\/\/fdc\.nal\.usda\.gov\/food-details\/\d+\/nutrients$/)
      expect(f.minG).toBeGreaterThan(0)
      expect(f.stepG).toBeGreaterThan(0)
      expect(f.maxG).toBeGreaterThanOrEqual(f.minG)
      expect((f.maxG - f.minG) % f.stepG).toBe(0)
      expect(Object.keys(f.per100).sort()).toEqual([...nutrients].sort())
      for (const value of Object.values(f.per100)) {
        if (value !== null) {
          expect(Number.isFinite(value)).toBe(true)
          expect(value).toBeGreaterThanOrEqual(0)
        }
      }
      expect(f.per100.kcal).toBeGreaterThan(0)
      expect(f.per100.protein).toBeTypeOf('number')
    }
  })

  it('retains both missing measurements and reported zeroes', () => {
    expect(get('beef-shank').per100.vitaminD).toBeNull()
    expect(get('walnuts').per100.omega3).toBeNull()
    expect(get('orange').per100.sodium).toBe(0)
    expect(get('tuna').per100.omega3).toBeCloseTo(0.002 + 0.028 + 0.196, 6)
    expect(get('sardines').per100.calcium).toBe(382)
    expect(get('milk').per100.vitaminD).toBe(0.1)
    expect(get('milk-fortified').per100.vitaminD).toBe(1.3)
  })

  it('distinguishes prepared products and applies shared exclusion tags', () => {
    for (const id of ['rice', 'chicken', 'egg', 'tofu']) expect(get(id).zeroCook).toBe(true)
    for (const id of ['beef-shank', 'oats']) expect(get(id).zeroCook).toBe(false)
    for (const id of ['whey', 'milk', 'milk-fortified']) expect(get(id).allergens).toContain('牛奶')
    for (const id of ['almonds', 'walnuts']) expect(get(id).allergens).toContain('树坚果')
    for (const id of ['tuna', 'sardines']) {
      expect(get(id).allergens).toContain('鱼类')
      expect(get(id).role).toBe('protein')
    }
    expect(get('tofu').allergens).toContain('大豆')
    expect(get('bread').allergens).toContain('小麦')
    expect(get('egg').allergens).toContain('鸡蛋')
  })
})
