import type { Food, Meal, Targets } from '../domain/types'
import { known, totals } from './nutrition'

/** Signed residuals are intentional: a negative protein balance is not a deficit. */
export function budget(saved: Meal[], targets: Targets, foods: Food[]): { used: Targets; remaining: Targets } {
  if (!known(targets.kcal) || !known(targets.protein)) {
    throw new RangeError('请填写有效的每日能量和蛋白质目标。')
  }
  const used: Targets = { kcal: 0, protein: 0 }
  for (const meal of saved) {
    const { kcal, protein } = totals(meal.portions, foods)
    if (kcal === null || protein === null) {
      throw new RangeError('已保存餐食的能量或蛋白质数据不全，请核对并编辑该餐后再生成。')
    }
    used.kcal += kcal
    used.protein += protein
  }
  if (!known(used.kcal) || !known(used.protein)) throw new RangeError('已保存的份量过大，请核对重量。')
  return { used, remaining: { kcal: targets.kcal - used.kcal, protein: targets.protein - used.protein } }
}
