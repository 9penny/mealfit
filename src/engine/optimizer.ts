import { nutrients, type Food, type Nutrient, type Preferences, type Request, type Result } from '../domain/types'
import { budget } from './budget'
import { known, totals } from './nutrition'

// These nutrients are rewarded for a documented contribution, never for a missing value.
// Sodium is reported in totals but is not a nutrient we try to maximize.
const coverage = ['fiber', 'calcium', 'iron', 'vitaminC', 'vitaminD', 'b12', 'omega3'] as const
const labels: Record<Nutrient, string> = {
  kcal: '能量', protein: '蛋白质', carbs: '碳水', fat: '脂肪', fiber: '膳食纤维',
  calcium: '钙', iron: '铁', sodium: '钠', vitaminC: '维生素 C', vitaminD: '维生素 D',
  b12: '维生素 B12', omega3: 'Omega-3',
}
const slotWeight = { breakfast: 0.8, lunch: 1.1, dinner: 1.1, custom: 1 }
const BEAM = 32, MAX_EXTRAS = 16
const fail = (message: string): Result => ({ ok: false, message })
const cmpId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0

function restriction(f: Food, prefs: Preferences): string | undefined {
  if (prefs.excludeIds.includes(f.id)) return `${f.name}已被排除，请另选食物。`
  const allergen = f.allergens.find(a => prefs.allergens.includes(a))
  if (allergen) return `${f.name}含已排除的过敏原（${allergen}），请更换食物。`
  if (prefs.zeroCook && !f.zeroCook) return `${f.name}需要烹饪，请换成即食食物或关闭免烹饪选项。`
  if (!known(f.per100.kcal) || !known(f.per100.protein)) return `${f.name}缺少可用的能量或蛋白质数据，请更换食物。`
  if (!known(f.minG) || !known(f.maxG) || !known(f.stepG) || f.stepG <= 0 || f.maxG <= 0 || f.maxG < f.minG) {
    return `${f.name}的份量范围无效，请更换食物或检查食材数据。`
  }
}

/** Sample at most limit on-grid portions, including the smallest and largest legal servings. */
function levels(food: Food, limit: number): number[] {
  const first = food.minG === 0 ? 1 : 0
  const ratio = (food.maxG - food.minG) / food.stepG
  const last = Math.floor(ratio + Number.EPSILON * Math.max(1, ratio) * 2)
  if (last < first || !Number.isSafeInteger(last)) return []
  const count = Math.min(limit, last - first + 1)
  return Array.from({ length: count }, (_, i) => {
    const idx = first + Math.round(i / Math.max(1, count - 1) * (last - first))
    return Math.min(food.maxG, food.minG + idx * food.stepG)
  })
}

type Choice = { f: Food; g: number; kcal: number; protein: number; micro: number[] }
function choice(f: Food, g: number): Choice {
  const contribution = (n: Nutrient) => known(f.per100[n]) ? f.per100[n] * (g / 100) : 0
  // micro contains only *documented contributions* for ranking; it is not a nutrient total.
  return { f, g, kcal: contribution('kcal'), protein: contribution('protein'), micro: coverage.map(contribution) }
}
type Candidate = { items: Choice[]; kcal: number; protein: number; lastExtra: number; rank: number[] }
function compare(a: Candidate, b: Candidate) {
  for (let i = 0; i < a.rank.length; i++) if (a.rank[i] !== b.rank[i]) return a.rank[i] - b.rank[i]
  return 0 // loops use canonical food/portion order; stable JS sort preserves ties
}

export function solve(req: Request, foods: Food[]): Result {
  if (!Number.isSafeInteger(req.mealsLeft) || req.mealsLeft < 1) return fail('剩余餐数须为正整数，并包含当前这餐。')
  if (!Object.hasOwn(slotWeight, req.slot)) return fail('请选择有效餐次。')
  if (!known(req.targets.kcal) || req.targets.kcal <= 0 || !known(req.targets.protein)) return fail('请检查每日能量和蛋白质目标。')
  const carb = foods.find(f => f.id === req.carbId), protein = foods.find(f => f.id === req.proteinId)
  if (carb?.role !== 'carb' || protein?.role !== 'protein' || carb.id === protein.id) return fail('请分别选择一项主食和一项主要蛋白质来源。')
  for (const f of [carb, protein]) {
    const issue = restriction(f, req.prefs)
    if (issue) return fail(issue)
  }
  let balance: ReturnType<typeof budget>
  try { balance = budget(req.saved, req.targets, foods) }
  catch (e) { return fail(e instanceof RangeError ? e.message : '请检查已保存餐食的数据。') }
  const { used, remaining } = balance
  if (remaining.kcal <= 0) return fail('当天已没有剩余能量预算，请检查已保存餐食或调整每日目标。')
  const share = slotWeight[req.slot] / (slotWeight[req.slot] + req.mealsLeft - 1)
  const desiredKcal = remaining.kcal * share, desiredProtein = Math.max(0, remaining.protein) * share
  const extraFoods = foods.filter(f => f.role === 'extra' && !restriction(f, req.prefs))
  const scale = coverage.map(n => {
    // A comparative serving scale derived from this catalog; not a daily intake recommendation.
    let max = 0
    for (const f of [carb, protein, ...extraFoods]) {
      if (known(f.per100[n])) max = Math.max(max, f.per100[n] * (Math.min(f.maxG, 100) / 100))
    }
    return max
  })
  const savedTotals = totals(req.saved.flatMap(m => m.portions), foods)
  const weights = coverage.map((n, i) => {
    const previous = savedTotals[n]
    // Unknown is neutral rather than proof of a deficiency.
    return previous === null || !scale[i] ? 1 : 1 / (1 + previous / scale[i])
  })
  const credit = (values: number[]) => values.reduce((sum, n, i) => sum + (scale[i] ? Math.min(1, n / scale[i]) * weights[i] : 0), 0)
  const extraGroups = extraFoods.map(f => ({ f, priority: credit(choice(f, Math.min(f.maxG, 100)).micro) }))
    .sort((a, b) => b.priority - a.priority || cmpId(a.f.id, b.f.id)).slice(0, MAX_EXTRAS)
    .map(({ f }) => levels(f, 8).map(g => choice(f, g)))
  const carbs = levels(carb, 20).map(g => choice(carb, g)), proteins = levels(protein, 20).map(g => choice(protein, g))
  if (!carbs.length || !proteins.length) return fail('所选食物没有有效的正数份量，请检查步长和上下限。')
  const guard = Math.max(req.targets.protein * 1.5, req.targets.protein + 20)
  function candidate(items: Choice[], kcal: number, p: number, lastExtra: number): Candidate {
    const deviation = Math.abs(kcal - desiredKcal) / Math.max(1, desiredKcal)
      + Math.max(0, desiredProtein - p) / Math.max(8, desiredProtein)
      + Math.max(0, used.protein + p - guard) / Math.max(8, req.targets.protein)
    const values = coverage.map((_, i) => items.reduce((sum, item) => sum + item.micro[i], 0))
    // Fit bands let useful complements win over nutritionally meaningless precision.
    const rank = [Math.floor(deviation / 0.08), -credit(values), deviation,
      items.reduce((s, i) => s + i.f.cost, 0), items.filter(i => !i.f.zeroCook).length, items.length]
    return { items, kcal, protein: p, lastExtra, rank }
  }
  let frontier: Candidate[] = []
  for (const c of carbs) for (const p of proteins) {
    if (c.kcal + p.kcal <= remaining.kcal) frontier.push(candidate([c, p], c.kcal + p.kcal, c.protein + p.protein, -1))
  }
  if (!frontier.length) return fail(`两项主食材的最小份量已超过剩余的 ${Math.floor(remaining.kcal)} kcal，请更换食材或调整已保存餐食。`)
  frontier.sort(compare)
  let best = frontier[0]
  for (let depth = 0; depth < 2; depth++) {
    // Reserve some beam slots for lower-energy partial meals that can still accept extras.
    const beam = new Set([...frontier.slice(0, BEAM), ...frontier.slice().sort((a, b) => a.kcal - b.kcal).slice(0, 8)])
    const next: Candidate[] = []
    for (const prev of beam) for (let ix = prev.lastExtra + 1; ix < extraGroups.length; ix++) {
      for (const extra of extraGroups[ix]) {
        const kcal = prev.kcal + extra.kcal
        if (kcal <= remaining.kcal) next.push(candidate([...prev.items, extra], kcal, prev.protein + extra.protein, ix))
      }
    }
    if (!next.length) break
    frontier = next.sort(compare)
    if (compare(frontier[0], best) < 0) best = frontier[0]
  }
  const portions = best.items.map(({ f, g, micro }, i) => {
    const positives = coverage.map((n, j) => ({ n, v: scale[j] ? micro[j] / scale[j] * weights[j] : 0 }))
      .filter(v => v.v > 0).sort((a, b) => b.v - a.v)
    const reason = i < 2 ? ['所选主食', '所选主要蛋白质来源'][i]
      : positives.length ? `搭配以补充${positives.slice(0, 2).map(x => labels[x.n]).join('、')}` : '搭配以接近本餐能量或蛋白质预算'
    return { foodId: f.id, grams: g, reason }
  })
  const notes = [`按剩余 ${req.mealsLeft} 餐及餐次估算，本餐参考约 ${Math.round(desiredKcal)} kcal、蛋白质 ${Math.round(desiredProtein)} g；这是弹性分配，并非每餐定额。`]
  if (best.protein < desiredProtein - 0.1) notes.push(`本餐距参考蛋白质量还差约 ${Math.ceil(desiredProtein - best.protein)} g，可更换蛋白质来源或在其他餐补充。`)
  if (remaining.protein <= 0) notes.push('已保存餐食已达到当日蛋白质目标，本餐仍保留所选蛋白质来源。')
  if (used.protein + best.protein > guard) notes.push('加入本餐后蛋白质将明显高于设定目标，可调整所选蛋白质食物或其份量。')
  if (best.kcal < desiredKcal * 0.85) notes.push('受食材与份量限制，本餐低于参考能量，可在下一餐重新分配或更换食物。')
  const mealTotals = totals(portions, foods)
  const missing = nutrients.filter(n => mealTotals[n] === null)
  if (missing.length) notes.push(`本餐${missing.map(n => labels[n]).join('、')}数据不全，总量未知。`)
  const noSources = coverage.filter(n => mealTotals[n] === 0 && savedTotals[n] === 0)
  if (noSources.length) notes.push(`已保存餐食与本餐尚未提供${noSources.map(n => labels[n]).join('、')}，可在之后的餐食搭配其他来源。`)
  return { ok: true, meal: { slot: req.slot, carbId: carb.id, proteinId: protein.id, portions }, notes }
}
