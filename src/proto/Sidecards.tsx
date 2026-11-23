import { useState, type FormEvent } from 'react'
import { labels, fmt } from '../components/MealDetails'
import { foods } from '../data/foods'
import { nutrients, type Nutrient } from '../domain/types'
import { type Day,type MainKey, sums } from './model'
import { MainMetric } from './MainMetric'
import './sidecards.css'
import {references,type Profile} from './reference'
import {effectiveReference,refText,gapText} from './ledgerReference'

const primary = ['kcal', 'protein'] as const
const sourceKeys = ['fiber', 'calcium', 'iron', 'vitaminC', 'vitaminD', 'b12', 'omega3'] as const
const shortName = (key: Nutrient) => key === 'omega3' ? 'Omega-3' : labels[key][0]

function CardIcon({ kind }: { kind: 'leaf' | 'ledger' }) {
  return <svg className="msc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'leaf' ? <><path d="M5 16C1 9 8 5 19 4c1 10-4 16-11 13"/><path d="M4 21c2-5 5-9 10-12"/></> : <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18m3-13h4m-4 4h4m-4 4h3"/></>}
  </svg>
}

export function Coverage({ day }: { day: Day }) {
  const selected = foods.filter(f => day.available.includes(f.id))
  return <section className="msc-card msc-coverage" aria-label="营养来源清单">
    <div className="msc-heading"><div><span className="msc-kicker" lang="en">02 / SOURCE CHECK</span><h2>营养来源清单</h2></div><CardIcon kind="leaf"/></div>
    <p className="msc-intro">从今天可用的 {selected.length} 种食物中找来源。</p>
    <ul className="msc-checklist">
      {sourceKeys.map(k => {
        // Choose an example by concentration, not by a supposed daily requirement.
        const example = selected.reduce<(typeof foods)[number] | undefined>((best, food) => {
          const n = food.per100[k]
          return n != null && n > (best?.per100[k] ?? 0) ? food : best
        }, undefined)
        const missing = selected.find(f => f.per100[k] == null)
        const status = example ? '有数值记录' : !selected.length ? '尚未选择食物' : missing ? '数据未知' : '所选食物记录为零'
        return <li key={k} className={example ? 'msc-source' : 'msc-no-source'}>
          <span className="msc-check" aria-label={status}>{example ? '✓' : missing ? '?' : '–'}</span>
          <span className="msc-nutrient" title={labels[k][0]}>{shortName(k)}</span>
          <span className="msc-example" title={example ? `每 100 g 含 ${fmt(example.per100[k]!, k)} ${labels[k][1]}` : undefined}>
            {example?.name ?? (missing ? `${missing.name} · 未知` : selected.length ? '均记录为 0' : '待选食物')}
          </span>
        </li>
      })}
    </ul>
    <p className="msc-note">勾选仅表示食材有该成分记录，不代表摄入达标。未知不等于零。</p>
  </section>
}

function amount(value: number | null, key: Nutrient) {
  return value == null ? '未知' : `${fmt(value, key)} ${labels[key][1]}`
}

type LedgerProps = { day: Day; profile:Profile; onTargets: (targets: Day['targets'],confirmed?:MainKey) => void }

function ReferenceForm({ targets, onSave, onCancel }: { targets: Day['targets']; onSave: LedgerProps['onTargets']; onCancel: () => void }) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const next: Day['targets'] = {...targets}
    for (const k of nutrients) {
      if(k==='kcal'||k==='protein')continue
      delete next[k]
      const raw = String(data.get(k) ?? '').trim()
      if (!raw) continue
      const value = Number(raw)
      if (!Number.isFinite(value) || value <= 0) {
        const input = e.currentTarget.elements.namedItem(k) as HTMLInputElement
        input.setCustomValidity('请输入大于零的参考值，或留空。')
        input.reportValidity()
        return
      }
      next[k] = value
    }
    onSave(next)
  }
  return <form className="msc-form" onSubmit={submit}>
    <fieldset><legend>编辑每日参考值</legend><p className="msc-note">仅对所选日期生效，优先于推荐值。留空使用适用的营养参考；钠按限量比较。</p>
      <div className="msc-fields">{nutrients.filter(k=>k!=='kcal'&&k!=='protein').map(k => <label key={k}>
        <span>{shortName(k)} <small>{labels[k][1]}</small></span>
        <input name={k} type="number" step="any" min="0" inputMode="decimal" defaultValue={targets[k] ?? ''} placeholder="未设置" onInput={e => e.currentTarget.setCustomValidity('')}/>
      </label>)}</div>
    </fieldset>
    <div className="msc-actions"><button className="msc-save" type="submit">保存参考值</button><button type="button" onClick={onCancel}>取消</button></div>
  </form>
}

export function Ledger({ day, profile, onTargets }: LedgerProps) {
  const { actual, forecast } = sums(day)
  const rec=references(profile,day.targets.kcal)
  const effective=(k:Nutrient)=>effectiveReference(k,rec[k],day.targets[k])
  const secondary=nutrients.filter(k=>k!=='kcal'&&k!=='protein')
  const [editing, setEditing] = useState(false)
  return <section className="msc-card msc-ledger" aria-label="每日营养账本">
    <div className="msc-heading"><div><span className="msc-kicker" lang="en">04 / DAILY LEDGER</span><h2>每日营养账本</h2></div><CardIcon kind="ledger"/></div>
    <p className="msc-intro">已记录的餐按实际量，未记录的餐按计划量预计。</p>
    <div className="msc-metrics">{primary.map(k=><MainMetric key={k} metric={k} target={day.targets[k]} reference={k==='protein'?rec.protein:undefined} legacy={day.legacyCandidates?.[k]} actual={actual[k]} forecast={forecast[k]} onSave={n=>{const next={...day.targets};if(n===undefined)delete next[k];else next[k]=n;onTargets(next,k)}}/>)}</div>
    <section aria-label="其他营养素对照"><details open className="msc-details msc-recommended"><summary>其他营养素 <small>{secondary.length} 项</small><span className="msc-chevron" aria-hidden="true"/></summary>
      <p className="msc-note">{profile.age===null&&profile.stage==='normal'?'未填年龄：暂用美国 FDA 通用标签值，不是个人处方。':profile.age!==null&&profile.age>=19?'依当前资料对照美加 DRI；缺少适用值时不计算差额。':'目前没有适用的成人分组值，可自行设置当天对照。'} 资料只用于对照，不代表单日差额就是营养缺乏。</p>
      <table><caption className="msc-sr">推荐参考、实际已吃及全天预计，各自与参考的差额</caption><thead><tr><th scope="col">营养素 / 参考</th><th scope="col">实际已吃</th><th scope="col">全天预计</th></tr></thead>
        <tbody>{secondary.map(k=><tr key={k}><th scope="row">{shortName(k)}<small className="msc-refvalue">{refText(rec[k],k)}</small>{day.targets[k]!=null&&<small>自设 {refText(effective(k),k)}</small>}</th>
          {[actual[k],forecast[k]].map((v,i)=><td key={i}><span>{amount(v,k)}</span><small>{gapText(v,effective(k),k)}</small></td>)}</tr>)}</tbody></table>
      <p className="msc-note">有自设值时，差额按自设值计算。钠是限量，不用补足。Omega-3 记录的是 ALA＋EPA＋DHA，未用单项推荐量代替。</p>
      <details className="msc-basis"><summary>这些参考值从哪里来？</summary>{secondary.filter(k=>rec[k]).map(k=><p key={k}>{shortName(k)}：{refText(rec[k],k)} · {rec[k]?.basis}</p>)}<p>未列出的营养素没有适用的自动参考。能量目标自行设置。</p><a href="https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables.html" target="_blank" rel="noreferrer">Health Canada · DRI 表</a> · <a href="https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels" target="_blank" rel="noreferrer">FDA · 每日标签参考值</a></details>
    </details></section>
    {editing ? <ReferenceForm key={JSON.stringify(day.targets)} targets={day.targets} onCancel={() => setEditing(false)} onSave={next => { onTargets(next); setEditing(false) }}/>
      : <button type="button" className="msc-edit" onClick={() => setEditing(true)}>编辑每日参考值<span aria-hidden="true"> ↗</span></button>}
  </section>
}
