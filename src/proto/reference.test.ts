import { describe, expect, it } from 'vitest'
import { references, type Profile } from './reference'

const profile = (overrides: Partial<Profile> = {}): Profile => ({
  nickname: '', age: null, sex: '', stage: 'normal', height: null, weight: null, ...overrides,
})
const adult = (overrides: Partial<Profile> = {}) => profile({age: 30, sex: 'female', ...overrides})

describe('generic adult label references', () => {
  it('uses the current FDA label column, and only sodium has a restriction direction', () => {
    const refs = references(profile())
    const values = Object.fromEntries(Object.entries(refs).map(([key, ref]) => {
      expect(ref.basis).toMatch(/FDA.*通用成人.*DV/)
      expect(ref.kind).toBe(key === 'sodium' ? 'limit' : 'point')
      return [key, ref.value]
    }))
    expect(values).toEqual({protein: 50, carbs: 275, fat: 78, fiber: 28, calcium: 1300, iron: 18,
      sodium: 2300, vitaminC: 90, vitaminD: 20, b12: 2.4})
  })
  it('does not infer an age or scale label values to a calorie target', () => {
    expect(references(profile({nickname: 'A', sex: 'female', weight: 54, height: 161}), 1800))
      .toEqual(references(profile()))
  })
})

describe('normal adult DRI table selection', () => {
  it.each([
    ['female', 19, 25, 1000, 18, 15], ['male', 19, 38, 1000, 8, 15],
    ['female', 30, 25, 1000, 18, 15], ['male', 31, 38, 1000, 8, 15],
    ['female', 50, 25, 1000, 18, 15], ['male', 50, 38, 1000, 8, 15],
    ['female', 51, 21, 1200, 8, 15], ['male', 51, 30, 1000, 8, 15],
    ['female', 70, 21, 1200, 8, 15], ['male', 70, 30, 1000, 8, 15],
    ['female', 71, 21, 1200, 8, 20], ['male', 71, 30, 1200, 8, 20],
  ] as const)('%s at %i years', (sex, age, fiber, calcium, iron, vitaminD) => {
    const refs = references(adult({sex, age}))
    const points = {protein: sex === 'male' ? 56 : 46, vitaminC: sex === 'male' ? 90 : 75,
      b12: 2.4, calcium, iron, vitaminD}
    for (const [key, value] of Object.entries(points)) {
      expect(refs[key as keyof typeof points]).toMatchObject({kind: 'point', value, basis: expect.stringContaining('RDA')})
    }
    expect(refs.fiber).toMatchObject({kind: 'point', value: fiber, basis: expect.stringContaining('AI')})
    expect(refs.sodium).toMatchObject({kind: 'limit', value: 2300, basis: expect.stringContaining('CDRR')})
  })
  it('uses the common protein RDA per kg independently of sex or height', () => {
    expect(references(adult({sex: '', weight: 65, height: 170})).protein).toMatchObject({value: 52, basis: expect.stringContaining('0.8')})
    expect(references(adult({weight: 65})).protein?.value).toBe(52)
  })
  it.each([0, -60, NaN, Infinity])('does not multiply invalid weight %s', weight => {
    expect(references(adult({weight})).protein?.value).toBe(46)
    expect(references(adult({weight, sex: ''})).protein).toBeUndefined()
  })
  it.each([19, 50, 51, 70, 71])('without sex returns exactly the shared adult rows at age %i', age => {
    const refs = references(adult({sex: '', age}), 1800)
    const male = references(adult({sex: 'male', age}), 1800)
    const female = references(adult({sex: 'female', age}), 1800)
    for (const key of Object.keys(male) as (keyof typeof male)[]) {
      const a = male[key]!, b = female[key]!
      if (a.value === b.value && a.low === b.low && a.high === b.high) {
        expect(refs[key]).toEqual({...a, basis: expect.stringContaining('DRI')})
      } else expect(refs[key]).toBeUndefined()
    }
  })
  it.each([900, 1800, 2300])('converts percent of %i kcal into gram ranges', kcal => {
    const {fat, carbs} = references(adult(), kcal)
    expect(fat).toMatchObject({kind: 'range', basis: expect.stringContaining('20–35%')})
    expect(fat!.low! * 9 / kcal).toBeCloseTo(0.20)
    expect(fat!.high! * 9 / kcal).toBeCloseTo(0.35)
    expect(carbs).toMatchObject({kind: 'range', basis: expect.stringContaining('45–65%')})
    expect(carbs!.low! * 4 / kcal).toBeCloseTo(0.45)
    expect(carbs!.high! * 4 / kcal).toBeCloseTo(0.65)
  })
  it.each([undefined, 0, -2000, NaN, Infinity])('does not invent a calorie basis from %s', kcal => {
    const refs = references(adult(), kcal)
    expect(refs.fat).toBeUndefined()
    expect(refs.carbs).toBeUndefined()
    expect(refs.protein?.value).toBe(46)
  })
})

describe('stage-specific rows and unsupported cases', () => {
  it.each(['pregnant', 'lactating'] as const)('uses %s rows at each supported age boundary', stage => {
    const pregnant = stage === 'pregnant'
    for (const age of [19, 30, 31, 50]) {
      const refs = references(adult({age, stage, weight: 67}), 1800)
      expect(refs.protein?.value).toBe(pregnant ? undefined : 71)
      expect(refs.iron?.value).toBe(pregnant ? 27 : 9)
      expect(refs.fiber?.value).toBe(pregnant ? 28 : 29)
      expect(refs.vitaminC?.value).toBe(pregnant ? 85 : 120)
      expect(refs.b12?.value).toBe(pregnant ? 2.6 : 2.8)
      expect(refs.vitaminD?.value).toBe(15)
      expect(refs.calcium?.value).toBe(1000)
      expect(refs.sodium).toMatchObject({kind: 'limit', value: 2300})
      expect(refs.fat).toMatchObject({kind: 'range', low: 40, high: 70})
      expect(refs.carbs).toMatchObject({kind: 'range', low: 202.5, high: 292.5})
      for (const ref of Object.values(refs)) expect(ref.basis).toContain(pregnant ? '孕期' : '哺乳期')
      expect(references(adult({age, stage, sex: ''}), 1800)).toEqual(refs)
    }
  })
  it.each(['pregnant', 'lactating'] as const)('never substitutes an adult DV/normal DRI for unmatched %s', stage => {
    for (const age of [null, 16, 18, 51, 71, NaN]) expect(references(adult({age, stage}), 2000)).toEqual({})
    expect(references(adult({sex: 'male', stage}), 2000)).toEqual({})
  })
  it.each([0, 4, 17, 18, 18.9, -1, 28.2, Infinity, NaN])('returns no adult values at age %s', age => {
    expect(references(adult({age}), 2000)).toEqual({})
  })
  it('does not substitute an ALA value for ALA+EPA+DHA, or a calorie input for a requirement', () => {
    for (const p of [profile(), adult(), adult({stage: 'pregnant'}), adult({stage: 'lactating'})]) {
      expect(references(p, 2000)).not.toHaveProperty('omega3')
      expect(references(p, 2000)).not.toHaveProperty('kcal')
    }
  })
})
