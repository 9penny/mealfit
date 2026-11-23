import { useId, useState } from 'react'
import { foods } from '../data/foods'
import type { MealSlot, Portion } from '../domain/types'
import { totals } from '../engine/nutrition'
import { suggest, type Day, type Entry } from './model'
import './meal-editor.css'

type Props = { day: Day; slot: MealSlot; onChange: (r: Entry) => void }
type Food = (typeof foods)[number]
const catalog = new Map(foods.map(f => [f.id, f]))
const foodName = (id: string) => catalog.get(id)?.name ?? id
const copy = (items: Portion[]) => items.map(p => ({ ...p }))
const format = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 })
const gramsIn = (list: Portion[] | null, id: string) => {
  const items = list?.filter(p => p.foodId === id)
  return items?.length ? `${items.reduce((n, p) => n + p.grams, 0)} g` : '—'
}

function SourceSelect({ label, value, options, onPick }: {
  label: string; value: string; options: Food[]; onPick: (id: string) => void
}) {
  const retained = value && !options.some(f => f.id === value)
  return <label className="me-field"><span>{label}</span>
    <select aria-label={label} value={value} onChange={e => onPick(e.currentTarget.value)}>
      <option value="">{options.length ? '请选择' : '暂无可用食物'}</option>
      {retained && <option value={value} disabled>{foodName(value)} · 今日不可用</option>}
      {options.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
    </select>
  </label>
}

function GramField({ grams, label, onEdit }: { grams: number; label: string; onEdit: (n: number) => void }) {
  // Keep intermediate input (such as a cleared field) separate from the journal.
  const [draft, setDraft] = useState<string | null>(null)
  return <label className="me-weight"><input type="number" min="0" step="any" inputMode="decimal"
    aria-label={label} value={draft ?? grams} onBlur={() => setDraft(null)}
    onChange={e => {
      const el = e.currentTarget
      setDraft(el.value)
      if (el.validity.valid && Number.isFinite(el.valueAsNumber)) onEdit(el.valueAsNumber)
    }} /><span aria-hidden="true">g</span></label>
}

function PortionList({ kind, items, available, plan, onEdit }: {
  kind: '计划' | '实吃'; items: Portion[]; available: string[]; plan: Portion[]; onEdit: (p: Portion[]) => void
}) {
  const additions = foods.filter(f => (kind === '实吃' || available.includes(f.id)) && !items.some(p => p.foodId === f.id))
  return <>
    {items.length > 0 && <ul className="me-foods">{items.map((p, index) => {
      const f = catalog.get(p.foodId)
      const flag = kind === '计划' && !available.includes(p.foodId) ? '今日不可用' :
        kind === '实吃' && !plan.some(x => x.foodId === p.foodId) ? '计划外' : ''
      return <li key={`${p.foodId}:${index}`} className="me-food">
        <div className="me-food-info"><span className="me-food-name">{foodName(p.foodId)}</span>
          {flag && <span className="me-flag">{flag}</span>}
          {f && <span className="me-basis">{f.basis}</span>}
        </div>
        <GramField label={`${kind} · ${foodName(p.foodId)}克数`} grams={p.grams}
          onEdit={grams => onEdit(items.map((v, i) => i === index ? { ...v, grams } : v))} />
        <button className="me-remove" type="button" aria-label={`从${kind}移除${foodName(p.foodId)}`}
          onClick={() => onEdit(items.filter((_, i) => i !== index))}>×</button>
      </li>
    })}</ul>}
    <select className="me-add" aria-label={`向${kind}添加食物`} value="" disabled={!additions.length}
      onChange={e => { const f = additions.find(x => x.id === e.currentTarget.value)
        if (f) onEdit([...items, { foodId: f.id, grams: f.minG, reason: '手动添加' }])
      }}>
      <option value="" disabled>{additions.length ? `＋ 添加${kind}食物` : '暂无其他可添加食物'}</option>
      {additions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
    </select>
  </>
}

function MealStat({ items }: { items: Portion[] }) {
  const sum = totals(items, foods)
  return <span className="me-stat">{sum.kcal === null ? '能量未知' : `${format.format(sum.kcal)} kcal`} · {sum.protein === null ? '蛋白质未知' : `蛋白质 ${format.format(sum.protein)} g`}</span>
}

type Preview = { day: Day; items: Portion[]; error?: never } | { day: Day; error: string; items?: never }

function SlotEditor({ day, slot, onChange }: Props) {
  const entry = day.meals[slot]
  const available = foods.filter(f => day.available.includes(f.id))
  const [preview, setPreview] = useState<Preview | null>(null)
  const prefix = useId()
  const pending = preview?.day === day ? preview : null
  const edit = (changes: Partial<Entry>) => { setPreview(null); onChange({ ...entry, ...changes }) }
  const record = (actual: Portion[]) => edit({ actual, original: entry.original ?? copy(entry.plan) })
  const previewPlan = () => {
    try { setPreview({ day, items: suggest(day, slot) }) }
    catch (e) { setPreview({ day, error: e instanceof Error ? e.message : '请检查食物选择后重试。' }) }
  }
  const compareIds = [...new Set([...(entry.original ?? []), ...entry.plan, ...(entry.actual ?? [])].map(p => p.foodId))]
  return <div className="me-editor">
    <section className="me-compose" aria-labelledby={`${prefix}-sources`}>
      <div className="me-heading"><h3 id={`${prefix}-sources`}>选择本餐搭配</h3></div>
      <div className="me-sources">
        <SourceSelect label="主食来源" value={entry.carb} options={available.filter(f => f.role === 'carb')}
          onPick={carb => edit({ carb })} />
        <SourceSelect label="主要蛋白质来源" value={entry.protein} options={available.filter(f => f.role === 'protein')}
          onPick={protein => edit({ protein })} />
      </div>
      <div className="me-actions"><button type="button" className="me-button me-primary" onClick={previewPlan}>预览份量建议</button>
        <p className="me-note">更换来源不会改动当前计划。</p></div>
      {pending?.error && <p className="me-error" role="alert">{pending.error}</p>}
      {pending?.items && <section className="me-preview" aria-label="建议预览">
        <div className="me-heading"><h4>建议预览</h4><MealStat items={pending.items} /></div>
        <ul>{pending.items.map(p => <li key={p.foodId}><span>{foodName(p.foodId)}<small>{p.reason}</small></span><b>{p.grams} g</b></li>)}</ul>
        <div className="me-actions"><button type="button" className="me-button me-primary"
          onClick={() => edit({ plan: copy(pending.items) })}>{entry.plan.length ? '应用并替换当前计划' : '应用到当前计划'}</button>
          <button type="button" className="me-button" onClick={() => setPreview(null)}>取消</button></div>
      </section>}
    </section>
    <section className="me-block" aria-labelledby={`${prefix}-plan`}>
      <div className="me-heading"><h3 id={`${prefix}-plan`}>当前计划</h3>{entry.plan.length > 0 && <MealStat items={entry.plan} />}</div>
      {!entry.plan.length && <p className="me-note">还没有计划。应用一份建议，或手动添加食物。</p>}
      <PortionList kind="计划" items={entry.plan} available={day.available} plan={entry.plan} onEdit={plan => edit({ plan })} />
    </section>
    <section className="me-block" aria-labelledby={`${prefix}-actual`}>
      <div className="me-heading"><h3 id={`${prefix}-actual`}>实际摄入</h3>{entry.actual === null ? <span className="me-status">未记录</span> : <MealStat items={entry.actual} />}</div>
      {entry.actual === null ? <>
        <p className="me-note">按计划吃了就直接确认，有变化也可逐项记录。首次记录会保留当时的计划。</p>
        <div className="me-actions"><button className="me-button" type="button" disabled={!entry.plan.length}
          onClick={() => record(copy(entry.plan))}>按计划确认实吃</button></div>
      </> : <p className="me-note">已记录 · 修改实吃克数或添加计划外食物，不影响计划。</p>}
      <PortionList kind="实吃" items={entry.actual ?? []} available={day.available} plan={entry.plan} onEdit={record} />
    </section>
    {entry.original !== null && <details className="me-compare">
      <summary>对照原计划、当前计划与实吃</summary>
      <table><caption>原计划保留首次记录实吃时的份量；— 表示未列入。</caption>
        <thead><tr><th scope="col">食物</th><th scope="col">原计划</th><th scope="col">当前计划</th><th scope="col">实吃</th></tr></thead>
        <tbody>{compareIds.map(id => <tr key={id}><th scope="row">{foodName(id)}</th>
          <td>{gramsIn(entry.original, id)}</td><td>{gramsIn(entry.plan, id)}</td><td>{gramsIn(entry.actual, id)}</td></tr>)}</tbody>
      </table>
    </details>}
  </div>
}

export default function MealEditor(props: Props) { return <SlotEditor key={props.slot} {...props} /> }
