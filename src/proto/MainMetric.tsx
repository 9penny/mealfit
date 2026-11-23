import { useState } from 'react'
import './main-metric.css'
import { fmt } from '../components/MealDetails'
import { gapText, refText } from './ledgerReference'
import type { Ref } from './reference'
import type { MainKey } from './model'

type Props = {
  metric: MainKey
  target?: number
  legacy?: number
  reference?: Ref
  actual: number | null
  forecast: number | null
  onSave: (n: number | undefined) => void
}

export function MainMetric({
  metric,
  target,
  legacy,
  reference,
  actual,
  forecast,
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const kcal = metric === 'kcal'
  const name = kcal ? '热量' : '蛋白质'
  const unit = kcal ? 'kcal' : 'g'
  const num = draft.trim() === '' ? NaN : Number(draft)
  const valid = Number.isFinite(num) && num > 0
  const max = Math.max(kcal ? 4000 : 200, valid ? Math.ceil(num) : 0, target ?? 0)
  const point: Ref | undefined =
    target === undefined
      ? undefined
      : { kind: 'point', value: target, basis: '当天自设目标' }

  function save(n: number | undefined) {
    onSave(n)
    setEditing(false)
  }

  return (
    <div className="msc-metric" aria-label={name + '记录'}>
      <div className="msc-metric-title">
        <h3>{name}</h3>
        <div className="mt-setting">
          {target !== undefined && (
            <small>
              今日目标 {fmt(target, metric)} {unit}
            </small>
          )}
          <button
            type="button"
            aria-label={`${target === undefined ? '设置' : '调整'}${name}目标`}
            aria-expanded={editing}
            onClick={() => {
              setDraft(target == null ? '' : String(target))
              setEditing(!editing)
            }}
          >
            {target === undefined ? '设置目标' : '调整'}
          </button>
        </div>
      </div>
      <div className="msc-pair">
        {[
          ['实际已吃', actual] as const,
          ['全天预计', forecast] as const,
        ].map(([label, n]) => (
          <div key={label}>
            <span className="msc-col-label">{label}</span>
            <strong>
              {fmt(n, metric)} {n !== null && <small>{unit}</small>}
            </strong>
            {point && <span className="msc-diff">{gapText(n, point, metric)}</span>}
          </div>
        ))}
      </div>
      {editing && (
        <form
          className="mt-editor"
          onSubmit={e => {
            e.preventDefault()
            if (valid) save(num)
          }}
        >
          <label className="mt-number">
            今日{name}目标{' '}
            <span>
              <input
                autoFocus
                type="number"
                step="any"
                required
                min="0"
                aria-label={name + '目标数值'}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="自行输入"
              />{' '}
              {unit}
            </span>
          </label>
          <input
            className="mt-slider"
            aria-label={name + '目标滑条'}
            type="range"
            min="0"
            max={max}
            step="any"
            value={valid ? num : 0}
            onChange={e => {
              const v = Number(e.target.value)
              setDraft(
                String(
                  Math.max(
                    kcal ? 1 : 0.1,
                    kcal ? Math.round(v) : Math.round(v * 10) / 10,
                  ),
                ),
              )
            }}
          />
          <small>拖动或输入数值，仅对所选日期生效。</small>
          {!kcal && (
            <p className="mt-hint">
              {reference ? (
                <>
                  人群参考：{refText(reference, 'protein')} / 天。{reference.basis}
                  。仅供查看，不自动设为目标。
                </>
              ) : (
                '当前资料暂无适用的人群参考，可直接设定自己的目标。'
              )}
            </p>
          )}
          {legacy != null && target == null && (
            <p className="mt-hint">
              旧版记录有 {legacy} {unit}，尚未确认。{' '}
              <button type="button" onClick={() => setDraft(String(legacy))}>
                填入旧值
              </button>
            </p>
          )}
          <div className="mt-actions">
            <button type="submit" disabled={!valid}>
              保存目标
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              取消
            </button>
            {(target !== undefined || legacy !== undefined) && (
              <button type="button" onClick={() => save(undefined)}>
                清除目标
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
