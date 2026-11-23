import { foods, DATA_VERSION } from '../data/foods'
import {
  nutrients,
  type Food,
  type MealSlot,
  type Nutrient,
  type Portion,
} from '../domain/types'
import { totals } from '../engine/nutrition'
import { dayKey, restore, slots, STORE_KEY } from '../store'

export type Entry = {
  carb: string
  protein: string
  plan: Portion[]
  actual: Portion[] | null
  original: Portion[] | null
}
export type MainKey = 'kcal' | 'protein'
export type Day = {
  legacyCandidates?: Partial<Record<MainKey, number>>
  available: string[]
  targets: Partial<Record<Nutrient, number>>
  meals: Record<MealSlot, Entry>
}

export const protoKey = (date: string) => `mealfit:daily:v2:${date}`
export const byId = new Map(foods.map(f => [f.id, f]))
export const blank = (): Entry => ({
  carb: '',
  protein: '',
  plan: [],
  actual: null,
  original: null,
})

export function newDay(): Day {
  return {
    available: ['oats', 'rice', 'bread', 'egg', 'chicken', 'tomato', 'milk', 'almonds'],
    targets: {},
    meals: {
      breakfast: blank(),
      lunch: blank(),
      dinner: blank(),
      custom: blank(),
    },
  }
}

export function sums(day: Day) {
  const all = Object.values(day.meals)
  return {
    actual: totals(all.flatMap(e => e.actual ?? []), foods),
    forecast: totals(all.flatMap(e => e.actual ?? e.plan), foods),
  }
}

function validList(v: unknown): v is Portion[] {
  return (
    Array.isArray(v) &&
    v.every(
      p =>
        p &&
        byId.has(p.foodId) &&
        Number.isFinite(p.grams) &&
        p.grams >= 0 &&
        typeof p.reason === 'string',
    )
  )
}

function validLegacyCandidates(v: unknown): boolean {
  if (v === undefined) return true
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  return Object.entries(v).every(
    ([k, val]) =>
      (k === 'kcal' || k === 'protein') &&
      typeof val === 'number' &&
      Number.isFinite(val) &&
      val > 0,
  )
}

// Older stores did not distinguish an intentional 120 g (or 1800 kcal) from the demo default.
// Preserve the number for explicit confirmation, without silently treating it as a chosen goal.
function reviewOldDefaults(day: Day): Day {
  const targets = { ...day.targets }
  const legacyCandidates: Day['legacyCandidates'] = {}
  for (const [k, n] of [
    ['kcal', 1800],
    ['protein', 120],
  ] as const) {
    if (targets[k] === n) {
      legacyCandidates[k] = n
      delete targets[k]
    }
  }
  return { ...day, targets, legacyCandidates }
}

export function readDay(date: string, storage: Pick<Storage, 'getItem'>): Day {
  const raw = storage.getItem(protoKey(date))
  if (raw) {
    const { version, data, manualTargets } = JSON.parse(raw)
    if (
      version !== DATA_VERSION ||
      !Array.isArray(data?.available) ||
      !data.available.every((id: string) => byId.has(id)) ||
      !data.targets ||
      typeof data.targets !== 'object' ||
      Array.isArray(data.targets) ||
      !Object.entries(data.targets).every(
        ([k, v]) =>
          nutrients.includes(k as Nutrient) &&
          typeof v === 'number' &&
          v > 0 &&
          Number.isFinite(v),
      ) ||
      !validLegacyCandidates(data.legacyCandidates) ||
      !slots.every(s => {
        const e = data.meals?.[s]
        return (
          e &&
          typeof e.carb === 'string' &&
          typeof e.protein === 'string' &&
          validList(e.plan) &&
          (e.actual === null || validList(e.actual)) &&
          (e.original === null || validList(e.original))
        )
      })
    ) {
      throw Error('记录格式不匹配')
    }
    return manualTargets === true ? data : reviewOldDefaults(data)
  }

  const day = newDay()
  const legacy = storage.getItem(STORE_KEY)
  let legacyDay: unknown = null
  if (legacy) {
    try {
      legacyDay = JSON.parse(legacy)?.day
    } catch {
      legacyDay = null
    }
  }
  if (legacy && legacyDay === date) {
    const old = restore(legacy, date, DATA_VERSION, foods)
    if (!old.notice) {
      day.targets = old.journal.targets
      for (const m of old.journal.saved) {
        day.meals[m.slot] = {
          ...blank(),
          carb: m.carbId,
          protein: m.proteinId,
          plan: m.portions,
        }
        day.available = [
          ...new Set([...day.available, ...m.portions.map(p => p.foodId)]),
        ]
      }
      const pref = old.journal.prefs
      day.available = day.available.filter(
        id =>
          !pref.excludeIds.includes(id) &&
          !byId.get(id)?.allergens.some(a => pref.allergens.includes(a)),
      )
    }
  }
  return reviewOldDefaults(day)
}

export function writeDay(
  date: string,
  day: Day,
  storage: Pick<Storage, 'setItem'>,
) {
  storage.setItem(
    protoKey(date),
    JSON.stringify({ version: DATA_VERSION, manualTargets: true, data: day }),
  )
}

export function shiftDate(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + n, 12))
}

// A soft, bounded starting point, not a cap. Normal servings retain weight even when targets are exceeded.
export function suggest(day: Day, slot: MealSlot): Portion[] {
  const e = day.meals[slot]
  const c = byId.get(e.carb)
  const p = byId.get(e.protein)
  if (
    !c ||
    !p ||
    c.role !== 'carb' ||
    p.role !== 'protein' ||
    ![c.id, p.id].every(id => day.available.includes(id))
  ) {
    throw Error('请从当天可用食物中各选一种主食和主要蛋白质。')
  }
  const elsewhere = slots
    .filter(s => s !== slot)
    .flatMap(s => day.meals[s].actual ?? day.meals[s].plan)
  const used = totals(elsewhere, foods)
  const share = slot === 'custom' ? 0.15 : slot === 'breakfast' ? 0.27 : 0.35
  const target = (k: MainKey) =>
    day.targets[k] == null
      ? null
      : Math.max(0, Math.min(day.targets[k]! * share, day.targets[k]! - (used[k] ?? 0)))
  const kcalTarget = target('kcal')
  const proteinTarget = target('protein')
  const portions = (f: Food) =>
    Array.from(
      { length: Math.floor((f.maxG - f.minG) / f.stepG) + 1 },
      (_, i) => f.minG + i * f.stepG,
    )
  const extra = foods
    .filter(f => f.role === 'extra' && day.available.includes(f.id))
    .sort((a, b) => {
      const rank = (x: Food) =>
        (elsewhere.some(z => z.foodId === x.id) ? 2 : 0) +
        (['tomato', 'cucumber', 'carrot', 'orange'].includes(x.id) ? 0 : 1)
      return rank(a) - rank(b)
    })[0]
  const xg = extra
    ? portions(extra)[Math.floor((portions(extra).length - 1) / 2)]
    : 0
  let best = Infinity
  let cg = c.minG
  let pg = p.minG
  for (const i of portions(c)) {
    for (const j of portions(p)) {
      const val = (k: 'protein' | 'kcal') =>
        ((c.per100[k] ?? 0) * i +
          (p.per100[k] ?? 0) * j +
          (extra?.per100[k] ?? 0) * xg) /
        100
      const score =
        (kcalTarget === null ? 0 : ((val('kcal') - kcalTarget) / 360) ** 2) +
        (proteinTarget === null
          ? 0
          : ((val('protein') - proteinTarget) / 30) ** 2) +
        0.8 * ((i - (c.minG + c.maxG) / 2) / (c.maxG - c.minG || 1)) ** 2 +
        0.8 * ((j - (p.minG + p.maxG) / 2) / (p.maxG - p.minG || 1)) ** 2
      if (score < best) {
        best = score
        cg = i
        pg = j
      }
    }
  }
  return [
    { foodId: c.id, grams: cg, reason: '自选主食' },
    { foodId: p.id, grams: pg, reason: '自选主要蛋白质' },
    ...(extra
      ? [{ foodId: extra.id, grams: xg, reason: '当天可用的搭配，可移除' }]
      : []),
  ]
}
