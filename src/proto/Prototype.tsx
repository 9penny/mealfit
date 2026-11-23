import { useState } from 'react'
import { dayKey, slots } from '../store'
import { newDay, readDay, writeDay, shiftDate, type Day } from './model'
import { FoodIndex } from './FoodIndex'
import { Coverage, Ledger } from './Sidecards'
import MealEditor from './MealEditor'
import type { MealSlot } from '../domain/types'
import './prototype.css'
import ProfilePanel from './ProfilePanel'
import { emptyProfile, parseProfile, profileKey } from './profileStore'
import type { Profile } from './reference'

const names: Record<MealSlot, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  custom: '加餐',
}

function load(date: string) {
  try {
    return { day: readDay(date, localStorage), issue: '' }
  } catch {
    return {
      day: newDay(),
      issue: '旧记录读取异常，此页暂不写回，以保留原记录。',
    }
  }
}

export default function Prototype() {
  const [date, setDate] = useState(() => dayKey())
  const [state, setState] = useState(() => load(date))
  const [slot, setSlot] = useState<MealSlot>('breakfast')
  const [warning, warn] = useState('')
  const [{ profile, profileNotice }, setProfile] = useState(() => {
    try {
      return {
        profile: parseProfile(localStorage.getItem(profileKey)),
        profileNotice: '',
      }
    } catch {
      return {
        profile: emptyProfile(),
        profileNotice: '未读取到有效个人资料，目前使用通用对照。',
      }
    }
  })

  function saveProfile(p: Profile) {
    try {
      localStorage.setItem(profileKey, JSON.stringify(p))
      setProfile({ profile: p, profileNotice: '' })
    } catch {
      setProfile({
        profile: p,
        profileNotice: '个人资料仅在本次页面生效，浏览器存储不可用。',
      })
    }
  }

  const { day } = state

  function change(next: Day) {
    setState({ ...state, day: next })
    try {
      if (!state.issue) writeDay(date, next, localStorage)
    } catch {
      warn('浏览器未能保存，本次编辑只在当前页面保留。')
    }
  }

  function nav(d: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return
    setDate(d)
    setState(load(d))
    warn('')
  }

  const alerts = [state.issue, warning, profileNotice].filter(Boolean)

  return (
    <div className="pd-app">
      <header className="pd-header">
        <div>
          <b className="pd-brand">
            <i aria-hidden="true">◒</i> MealFit
          </b>
          <span className="pd-headerlabel">饮食手记</span>
          <small>本地记录</small>
          <ProfilePanel profile={profile} onSave={saveProfile} />
        </div>
      </header>
      <main className="pd-main">
        <div className="pd-intro">
          <div>
            <small className="pd-kicker">
              MEALFIT JOURNAL &nbsp; / &nbsp; DAILY DESK
            </small>
            <h1>
              每日饮食手记<span>。</span>
            </h1>
            <p>选食物，安排每一餐，再记下实际吃了什么。</p>
          </div>
          <div className="pd-calendar">
            <button aria-label="前一天" onClick={() => nav(shiftDate(date, -1))}>
              ‹
            </button>
            <label>
              <small>{date === dayKey() ? '今天' : '所选日期'} · 饮食日历</small>
              <input
                aria-label="选择记录日期"
                type="date"
                value={date}
                onChange={e => nav(e.target.value)}
              />
            </label>
            <button aria-label="后一天" onClick={() => nav(shiftDate(date, 1))}>
              ›
            </button>
            {date !== dayKey() && (
              <button className="pd-today" onClick={() => nav(dayKey())}>
                今天
              </button>
            )}
          </div>
        </div>
        {alerts.map((msg, i) => (
          <p key={i} role="alert">
            {msg}
          </p>
        ))}
        <div className="pd-grid">
          <FoodIndex
            day={day}
            change={available => change({ ...day, available })}
          />
          <div className="pd-coverage">
            <Coverage day={day} />
          </div>
          <section className="pd-card pd-meals">
            <div className="pd-heading">
              <div>
                <small className="pd-kicker">03 / MEAL JOURNAL</small>
                <h2>分餐安排</h2>
              </div>
              <span className="pd-count">
                {slots.filter(s => day.meals[s].actual !== null).length} 餐已记录
              </span>
            </div>
            <div className="pd-tabs" aria-label="餐次">
              {slots.map(s => (
                <button
                  key={s}
                  aria-pressed={s === slot}
                  onClick={() => setSlot(s)}
                >
                  {names[s]}
                  {day.meals[s].actual !== null ? ' ✓' : ''}
                </button>
              ))}
            </div>
            <MealEditor
              key={date + slot}
              day={day}
              slot={slot}
              onChange={entry =>
                change({ ...day, meals: { ...day.meals, [slot]: entry } })
              }
            />
          </section>
          <div className="pd-ledger">
            <Ledger
              key={date}
              day={day}
              profile={profile}
              onTargets={(targets, confirmed) => {
                const legacyCandidates = { ...day.legacyCandidates }
                if (confirmed) delete legacyCandidates[confirmed]
                change({ ...day, targets, legacyCandidates })
              }}
            />
          </div>
        </div>
        <footer>
          MealFit · 食物按可食部估算，数值仅作饮食记录。
          <span>保存在当前浏览器，不跨设备同步。</span>
        </footer>
      </main>
    </div>
  )
}
