import type { Food, Nutrient, Portion } from '../domain/types'

import { nutrients } from '../domain/types'

export function known(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Sum edible grams, without display rounding. Null means the total is not known. */
export function totals(portions: Portion[], foods: Food[]): Record<Nutrient, number | null> {
  const byId = new Map(foods.map(food => [food.id, food]))
  const result: Record<Nutrient, number | null> = {
    kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, calcium: 0, iron: 0,
    sodium: 0, vitaminC: 0, vitaminD: 0, b12: 0, omega3: 0,
  }
  for (const { foodId, grams } of portions) {
    if (!known(grams)) throw new RangeError('食物重量须为有限的非负克数，请检查份量。')
    if (grams === 0) continue
    const record = byId.get(foodId)?.per100
    for (const key of nutrients) {
      const previous = result[key]
      const value = record?.[key]
      if (previous === null || !known(value)) result[key] = null
      else {
        const amount = previous + value * (grams / 100)
        result[key] = Number.isFinite(amount) ? amount : null
      }
    }
  }
  return result
}
