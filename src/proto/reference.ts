import type { Nutrient } from '../domain/types'

export type Profile = {
  nickname: string
  age: number | null // completed years
  sex: '' | 'female' | 'male'
  stage: 'normal' | 'pregnant' | 'lactating'
  height: number | null // cm
  weight: number | null // kg
}

export type Ref = {
  kind: 'point' | 'limit' | 'range'
  low?: number
  high?: number
  value?: number
  basis: string
}

type Refs = Partial<Record<Nutrient, Ref>>
const point = (value: number, basis: string): Ref => ({kind: 'point', value, basis})
const limit = (value: number, basis: string): Ref => ({kind: 'limit', value, basis})
const positive = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0

// Label comparators, not individualized intake goals. See docs/REFERENCES.md.
function labelValues(): Refs {
  const dv = '美国 FDA 通用成人食品标签每日参考值（DV），非个人目标'
  return {
    protein: point(50, dv), carbs: point(275, dv), fat: point(78, dv), fiber: point(28, dv),
    calcium: point(1300, dv), iron: point(18, dv), sodium: limit(2300, `${dv}；限量参考`),
    vitaminC: point(90, dv), vitaminD: point(20, dv), b12: point(2.4, dv),
  }
}

export function references(profile: Profile, kcal?: number): Partial<Record<Nutrient, Ref>> {
  const {age, sex, stage, weight} = profile
  if (age === null) return stage === 'normal' ? labelValues() : {}
  if (!Number.isSafeInteger(age) || age < 19) return {}
  if (stage !== 'normal' && stage !== 'pregnant' && stage !== 'lactating') return {}
  if (stage !== 'normal' && (age > 50 || sex === 'male')) return {}

  const group = age <= 30 ? '19–30 岁' : age <= 50 ? '31–50 岁' : age <= 70 ? '51–70 岁' : '71 岁及以上'
  const category = stage === 'pregnant' ? '孕期' : stage === 'lactating' ? '哺乳期'
    : sex === 'male' ? '男性' : sex === 'female' ? '女性' : '男女相同项'
  const source = `Health Canada DRI · ${group} · ${category}`
  const rda = `${source} · 推荐摄入量 RDA`
  const ai = `${source} · 适宜摄入量 AI`
  const refs: Refs = {
    vitaminD: point(age > 70 ? 20 : 15, rda),
    sodium: limit(2300, `${source} · CDRR：超过此量建议减少摄入，不是应达到的目标`),
  }
  if (positive(kcal)) {
    const amdr = `${source} · 可接受供能比例 AMDR（按 ${kcal} kcal 换算）`
    refs.fat = {kind: 'range', low: kcal * 0.20 / 9, high: kcal * 0.35 / 9, basis: `${amdr} · 20–35%`}
    refs.carbs = {kind: 'range', low: kcal * 0.45 / 4, high: kcal * 0.65 / 4, basis: `${amdr} · 45–65%`}
  }

  if (stage !== 'normal') {
    const pregnant = stage === 'pregnant'
    refs.calcium = point(1000, rda)
    refs.iron = point(pregnant ? 27 : 9, rda)
    refs.fiber = point(pregnant ? 28 : 29, ai)
    refs.vitaminC = point(pregnant ? 85 : 120, rda)
    refs.b12 = point(pregnant ? 2.6 : 2.8, rda)
    // Pregnancy protein requirements depend on the half of pregnancy, not collected here.
    if (!pregnant) refs.protein = point(71, `${rda} · 表列参考体重`)
    return refs
  }

  refs.b12 = point(2.4, rda)
  if (positive(weight)) refs.protein = point(weight * 0.8, `${rda} · 每公斤体重 0.8 g`)
  else if (sex) refs.protein = point(sex === 'male' ? 56 : 46, `${rda} · 表列参考体重`)

  if (sex) {
    const male = sex === 'male'
    refs.fiber = point(male ? (age <= 50 ? 38 : 30) : (age <= 50 ? 25 : 21), ai)
    refs.vitaminC = point(male ? 90 : 75, rda)
  }
  // With sex unspecified, output only values shared by both rows for this age.
  if (sex || age <= 50 || age > 70) refs.calcium = point(age > 70 || (sex === 'female' && age > 50) ? 1200 : 1000, rda)
  if (sex || age > 50) refs.iron = point(sex === 'female' && age <= 50 ? 18 : 8, rda)
  return refs
}
