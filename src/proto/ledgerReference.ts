import type { Nutrient } from '../domain/types'
import type { Ref } from './reference'
import { fmt, labels } from '../components/MealDetails'

export function effectiveReference(
  k: Nutrient,
  recommended: Ref | undefined,
  custom: number | undefined,
): Ref | undefined {
  if (custom == null) return recommended
  return {
    kind: k === 'sodium' ? 'limit' : 'point',
    value: custom,
    high: k === 'sodium' ? custom : undefined,
    basis: '当天自设对照',
  }
}

export function refText(r: Ref | undefined, k: Nutrient) {
  if (!r) return '暂无适用值'
  const u = labels[k][1]
  if (r.kind === 'range') return `${fmt(r.low!, k)}–${fmt(r.high!, k)} ${u}`
  return `${r.kind === 'limit' ? '≤ ' : ''}${fmt(r.value ?? r.high ?? null, k)} ${u}`
}

export function gapText(
  v: number | null,
  r: Ref | undefined,
  k: Nutrient,
) {
  if (v === null) return '差值未知'
  if (!r) return '不计算差值'
  const diff = (n: number) => {
    const precision = k === 'kcal' ? 1 : 0.01
    return `${n > 0 && n < precision ? `< ${precision}` : fmt(n, k)} ${labels[k][1]}`
  }
  if (r.kind === 'range') {
    if (v < r.low!) return `低于范围 ${diff(r.low! - v)}`
    if (v > r.high!) return `高于范围 ${diff(v - r.high!)}`
    return '在参考范围内'
  }
  const value = r.value ?? r.high!
  const d = v - value
  if (r.kind === 'limit') {
    return Math.abs(d) < 1e-8
      ? '已到限量'
      : d > 0
        ? `超出限量 ${diff(d)}`
        : `距限量 ${diff(-d)}`
  }
  return Math.abs(d) < 1e-8
    ? '与参考值相同'
    : d > 0
      ? `多 ${diff(d)}`
      : `还差 ${diff(-d)}`
}
