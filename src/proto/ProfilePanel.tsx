import { useId, useRef, useState, type FormEvent } from 'react'
import type {Profile} from './reference'
import './profile.css'

type Props = { profile: Profile; onSave: (p: Profile) => void }
type NumberField = 'age' | 'height' | 'weight'
type Draft = Omit<Profile, NumberField> & Record<NumberField, string>

const blank: Draft = { nickname: '', age: '', sex: '', stage: 'normal', height: '', weight: '' }
const numeric = (value: string) => value === '' ? null : Number(value)

export default function ProfilePanel({ profile, onSave }: Props) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const [draft, setDraft] = useState<Draft>(blank)
  const [notice, setNotice] = useState('')

  function open() {
    setDraft({ ...profile, age: String(profile.age ?? ''), height: String(profile.height ?? ''), weight: String(profile.weight ?? '') })
    setNotice('')
    dialog.current?.showModal()
    title.current?.focus()
  }
  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(prev => ({ ...prev, [key]: value }))
    setNotice('')
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({ ...draft, nickname: draft.nickname.trim(), age: numeric(draft.age), height: numeric(draft.height), weight: numeric(draft.weight) })
    dialog.current?.close()
  }
  function numberField(key: NumberField, label: string, unit: string, min: number, max: number) {
    return <div className="pf-field">
      <label htmlFor={`${id}-${key}`}>{label}</label>
      <div className="pf-number">
        <input id={`${id}-${key}`} type="number" inputMode={key === 'age' ? 'numeric' : 'decimal'}
          min={min} max={max} step={key === 'age' ? 1 : 'any'} aria-describedby={`${id}-${key}-range`}
          value={draft[key]} onChange={e => change(key, e.target.value)} />
        <span aria-hidden="true">{unit}</span>
      </div>
      <span className="pf-hint" id={`${id}-${key}-range`}>{min}–{max} {unit}</span>
    </div>
  }

  return <>
    <button type="button" className="pf-trigger" ref={trigger} onClick={open} aria-haspopup="dialog" aria-controls={`${id}-dialog`}>
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="6.5" r="3"/><path d="M3.5 17v-1a6.5 6.5 0 0 1 13 0v1" strokeLinecap="round"/></svg>
      个人资料
    </button>
    <dialog ref={dialog} id={`${id}-dialog`} className="pf-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-intro`}
      onClose={() => trigger.current?.focus()}>
      <form onSubmit={save}>
        <div className="pf-heading">
          <div><span className="pf-kicker" lang="en">MEALFIT / PROFILE</span><h2 id={`${id}-title`} ref={title} tabIndex={-1}>个人资料</h2></div>
          <button type="button" className="pf-close" aria-label="关闭个人资料" onClick={() => dialog.current?.close()}>×</button>
        </div>
        <p id={`${id}-intro`} className="pf-intro">所有项目均为选填，资料仅保存在当前浏览器。</p>
        <div className="pf-fields">
          <div className="pf-field"><label htmlFor={`${id}-nickname`}>昵称</label>
            <input id={`${id}-nickname`} type="text" maxLength={32} placeholder="怎么称呼你？" value={draft.nickname} onChange={e => change('nickname', e.target.value)} />
          </div>
          {numberField('age', '年龄', '岁', 0, 120)}
          <div className="pf-field"><label htmlFor={`${id}-sex`}>参考性别</label>
            <select id={`${id}-sex`} value={draft.sex} onChange={e => change('sex', e.target.value as Profile['sex'])}>
              <option value="">未填写</option><option value="female">女性</option><option value="male">男性</option>
            </select>
          </div>
          <div className="pf-field"><label htmlFor={`${id}-stage`}>生理阶段</label>
            <select id={`${id}-stage`} value={draft.stage} onChange={e => change('stage', e.target.value as Profile['stage'])}>
              <option value="normal">非孕哺期 / 未填写</option><option value="pregnant">孕期</option><option value="lactating">哺乳期</option>
            </select>
          </div>
        </div>
        <div className="pf-record"><h3>身体记录</h3><span>身高仅记录；非孕哺成人体重可用于蛋白质参考</span></div>
        <div className="pf-fields">{numberField('height', '身高', 'cm', 30, 250)}{numberField('weight', '体重', 'kg', 1, 500)}</div>
        <p className="pf-note">年龄、参考性别和生理阶段仅用于账本参考值对照，不改变每餐克数，也不会自动设定能量目标。</p>
        <p className="pf-notice" role="status">{notice}</p>
        <div className="pf-actions">
          <button type="button" className="pf-clear" onClick={() => { setDraft(blank); setNotice('表单已清空。保存后生效，取消可保留原资料。') }}>清空表单</button>
          <button type="button" onClick={() => dialog.current?.close()}>取消</button>
          <button type="submit" className="pf-save">保存资料</button>
        </div>
      </form>
    </dialog>
  </>
}
