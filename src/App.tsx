import { useEffect, useState } from "react";
import { foods, DATA_VERSION } from "./data/foods";
import type {
  Food,
  Meal,
  MealSlot,
  Preferences,
  Targets,
} from "./domain/types";
import { solve } from "./engine/optimizer";
import { budget } from "./engine/budget";
import { totals } from "./engine/nutrition";
import {
  dayKey,
  fresh,
  restore,
  slots,
  STORE_KEY,
  type Journal,
} from "./store";
import { MealDetails, fmt } from "./components/MealDetails";
import { Produce } from "./components/Produce";

const slotNames: Record<MealSlot, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  custom: "加餐",
};
const allergenList = [...new Set(foods.flatMap((f) => f.allergens))].sort();
const toggle = (list: string[], v: string) =>
  list.includes(v) ? list.filter((i) => i !== v) : [...list, v];
function initial() {
  try {
    return restore(
      localStorage.getItem(STORE_KEY),
      dayKey(),
      DATA_VERSION,
      foods,
    );
  } catch {
    return {
      journal: fresh(dayKey(), DATA_VERSION),
      notice: "本地存储不可用，本次操作仅保留在当前页面。",
    };
  }
}
export default function App() {
  const [loaded] = useState(initial),
    [j, setJ] = useState<Journal>(loaded.journal),
    [notice, setNotice] = useState(loaded.notice),
    [slot, setSlot] = useState<MealSlot>("lunch"),
    [carb, setCarb] = useState(
      loaded.journal.saved.find((m) => m.slot === "lunch")?.carbId ?? "rice",
    ),
    [protein, setProtein] = useState(
      loaded.journal.saved.find((m) => m.slot === "lunch")?.proteinId ??
        "chicken",
    ),
    [left, setLeft] = useState(2),
    [settings, setSettings] = useState(false);
  const [draft, setDraft] = useState<{
      key: string;
      meal: Meal;
      previous?: Meal;
      notes: string[];
    } | null>(null),
    [error, setError] = useState("");
  const [targetForm, setTargetForm] = useState({
    kcal: String(j.targets.kcal),
    protein: String(j.targets.protein),
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(j));
    } catch {
      setNotice("本地保存失败；请在关闭页面前保留所需记录。");
    }
  }, [j]);
  useEffect(() => {
    const rollover = () => {
      const today = dayKey();
      if (j.day !== today) {
        setJ((s) => ({ ...s, day: today, saved: [] }));
        setDraft(null);
        setError("");
        setNotice("新的一天，已清空昨日餐单并保留偏好。");
      }
    };
    const id = setInterval(rollover, 15000);
    window.addEventListener("focus", rollover);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", rollover);
    };
  }, [j.day]);
  const eligible = (f: Food) =>
    (!j.prefs.zeroCook || f.zeroCook) &&
    !j.prefs.excludeIds.includes(f.id) &&
    !f.allergens.some((a) => j.prefs.allergens.includes(a));
  const carbs = foods.filter((f) => f.role === "carb" && eligible(f)),
    proteins = foods.filter((f) => f.role === "protein" && eligible(f));
  const car = carbs.find((f) => f.id === carb)?.id ?? "",
    pro = proteins.find((f) => f.id === protein)?.id ?? "";
  const old = j.saved.find((m) => m.slot === slot),
    fixed = j.saved.filter((m) => m.slot !== slot),
    key = JSON.stringify([j, slot, car, pro, left]);
  const preview = draft?.key === key ? draft : null;
  const b = budget(j.saved, j.targets, foods);
  function prefs(update: Partial<Preferences>) {
    setJ((s) => ({ ...s, prefs: { ...s.prefs, ...update } }));
    setError("");
  }
  function selectSlot(s: MealSlot) {
    setSlot(s);
    setError("");
    setDraft(null);
    const saved = j.saved.find((m) => m.slot === s);
    if (saved) {
      setCarb(saved.carbId);
      setProtein(saved.proteinId);
    }
    setLeft(Math.max(1, 3 - j.saved.filter((m) => m.slot !== s).length));
  }
  function generate() {
    const result = solve(
      {
        slot,
        carbId: car,
        proteinId: pro,
        mealsLeft: left,
        saved: fixed,
        targets: j.targets,
        prefs: j.prefs,
      },
      foods,
    );
    setNotice("");
    if (!result.ok) {
      setError(result.message);
      setDraft(null);
      return;
    }
    setError("");
    setDraft({
      key,
      meal: result.meal,
      previous: old ?? (draft?.meal.slot === slot ? draft.meal : undefined),
      notes: result.notes,
    });
  }
  function save() {
    if (!preview) return;
    if (dayKey() !== j.day) {
      setJ((s) => ({ ...s, day: dayKey(), saved: [] }));
      setDraft(null);
      setNotice("日期已变更，请按今天的预算重新生成。");
      return;
    }
    setJ((s) => ({
      ...s,
      saved: [...s.saved.filter((m) => m.slot !== slot), preview.meal],
    }));
    setDraft(null);
    setNotice(`${slotNames[slot]}已保存，今日预算已更新。`);
  }
  function setTargets(e: React.FormEvent) {
    e.preventDefault();
    const t: Targets = {
      kcal: Number(targetForm.kcal),
      protein: Number(targetForm.protein),
    };
    if (!Object.values(t).every((n) => Number.isFinite(n) && n > 0)) return;
    setJ((s) => ({ ...s, targets: t }));
    setSettings(false);
    setError("");
    setNotice("每日目标已更新，已存餐单保持原样。");
  }
  function choose(
    label: string,
    list: Food[],
    v: string,
    change: (s: string) => void,
  ) {
    return (
      <label className="field">
        {label}
        <select
          value={v}
          onChange={(e) => {
            change(e.target.value);
            setError("");
          }}
        >
          {!v && (
            <option value="">
              {list.length ? "原选择已排除，请重新选择" : "没有符合限制的食物"}
            </option>
          )}
          {list.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <>
      <header>
        <div className="bar">
          <a className="brand" href="#top" aria-label="MealFit 首页">
            <span className="logo">◒</span>MealFit
          </a>
          <span className="brandtag">一餐一配</span>
          <span className="today">{j.day.replaceAll("-", " / ")}</span>
        </div>
      </header>
      <main id="top">
        <div className="hero">
          <div>
            <div className="eyebrow">
              <i /> DAILY MEAL PLANNER
            </div>
            <h1>
              今日配餐手记<span>·</span>
            </h1>
            <p>选好主食和蛋白质，其余交给 MealFit。</p>
          </div>
          <Produce />
        </div>
        {notice && (
          <p className="notice" role="status">
            {notice}{" "}
            <button onClick={() => setNotice("")} aria-label="关闭通知">
              ×
            </button>
          </p>
        )}
        <div className="grid">
          <section className="card builder">
            <div className="kicker">01 / MEAL BUILDER</div>
            <h2>配一餐</h2>
            <fieldset>
              <legend>这次安排哪一餐？</legend>
              <div className="segments">
                {slots.map((s) => (
                  <button
                    key={s}
                    aria-pressed={s === slot}
                    onClick={() => selectSlot(s)}
                  >
                    {slotNames[s]}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="pair">
              {choose("主食来源", carbs, car, setCarb)}
              {choose("蛋白质来源", proteins, pro, setProtein)}
            </div>
            <p className="hint">
              按可食部重量计算；即食和熟制食物以目录说明为准。
            </p>
            <div className="rule" />
            <div className="optionrow">
              <label>
                <input
                  type="checkbox"
                  checked={j.prefs.zeroCook}
                  onChange={(e) => prefs({ zeroCook: e.target.checked })}
                />
                只用免开火食物
              </label>
              <label>
                还要安排{" "}
                <select
                  aria-label="包含本餐的剩余餐数"
                  value={left}
                  onChange={(e) => {
                    setLeft(+e.target.value);
                    setError("");
                  }}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} 餐
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <details className="restrictions">
              <summary>
                过敏原与食物排除{" "}
                {j.prefs.excludeIds.length + j.prefs.allergens.length > 0
                  ? `（${j.prefs.excludeIds.length + j.prefs.allergens.length}）`
                  : ""}
              </summary>
              <p className="hint">
                限制用于新方案，不会修改已保存的餐单。包装配方可能不同，请核对标签。
              </p>
              <b>排除过敏原</b>
              <div className="checks">
                {allergenList.map((a) => (
                  <label key={a}>
                    <input
                      type="checkbox"
                      checked={j.prefs.allergens.includes(a)}
                      onChange={() =>
                        prefs({ allergens: toggle(j.prefs.allergens, a) })
                      }
                    />
                    {a}
                  </label>
                ))}
              </div>
              <b>排除具体食物</b>
              <div className="checks">
                {foods.map((f) => (
                  <label key={f.id}>
                    <input
                      type="checkbox"
                      checked={j.prefs.excludeIds.includes(f.id)}
                      onChange={() =>
                        prefs({ excludeIds: toggle(j.prefs.excludeIds, f.id) })
                      }
                    />
                    {f.name}
                  </label>
                ))}
              </div>
            </details>
            {old && (
              <p className="hint">
                正在编辑已存{slotNames[slot]}
                。只有保存新方案后，原餐单才会被替换。
              </p>
            )}
            {error && (
              <p role="alert" className="warn">
                {error}
              </p>
            )}
            <button className="action" onClick={generate}>
              生成{slotNames[slot]}方案 <span>→</span>
            </button>
            {preview && (
              <div className="result" aria-live="polite">
                <div className="kicker">MEAL PREVIEW / 待保存</div>
                <h3>{slotNames[slot]}方案</h3>
                <MealDetails meal={preview.meal} previous={preview.previous} />
                {preview.notes.map((n, i) => (
                  <p key={i} className="hint">
                    {n}
                  </p>
                ))}
                <p className="forecast">
                  保存后剩余：
                  {Math.round(
                    j.targets.kcal -
                      budget([...fixed, preview.meal], j.targets, foods).used
                        .kcal,
                  )}{" "}
                  kcal · 距蛋白目标{" "}
                  {fmt(
                    Math.max(
                      0,
                      budget([...fixed, preview.meal], j.targets, foods)
                        .remaining.protein,
                    ),
                  )}{" "}
                  g
                </p>
                <button className="action" onClick={save}>
                  {old ? "替换并保存" : "保存这餐"}
                </button>
              </div>
            )}
          </section>
          <aside>
            <section className="card ledger">
              <div className="kicker">02 / DAILY BUDGET</div>
              <div className="titleline">
                <h2>今日预算</h2>
                <button
                  className="textbtn"
                  onClick={() => {
                    setSettings(!settings);
                    setTargetForm({
                      kcal: String(j.targets.kcal),
                      protein: String(j.targets.protein),
                    });
                  }}
                >
                  {settings ? "收起" : "调整目标"}
                </button>
              </div>
              {settings && (
                <form className="settings" onSubmit={setTargets}>
                  <label>
                    每日能量（kcal）
                    <input
                      type="number"
                      min="1"
                      required
                      value={targetForm.kcal}
                      onChange={(e) =>
                        setTargetForm({ ...targetForm, kcal: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    每日蛋白质（g）
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      required
                      value={targetForm.protein}
                      onChange={(e) =>
                        setTargetForm({
                          ...targetForm,
                          protein: e.target.value,
                        })
                      }
                    />
                  </label>
                  <button>应用目标</button>
                </form>
              )}
              {(["kcal", "protein"] as const).map((k) => (
                <div className="meter" key={k}>
                  <div>
                    <b>{k === "kcal" ? "能量" : "蛋白质"}</b>
                    <small>
                      目标 {j.targets[k]} {k === "kcal" ? "kcal" : "g"}
                    </small>
                  </div>
                  <strong>{fmt(b.used[k], k)}</strong>{" "}
                  <small>{k === "kcal" ? "kcal" : "g"} 已安排</small>
                  <div className={"track " + k}>
                    <i
                      style={{
                        width: `${Math.max(0, Math.min(100, (100 * b.used[k]) / j.targets[k]))}%`,
                      }}
                    />
                  </div>
                  <small>
                    {b.remaining[k] < 0 ? "已超出目标" : "距离目标还差"}{" "}
                    {fmt(Math.abs(b.remaining[k]), k)}{" "}
                    {k === "kcal" ? "kcal" : "g"}
                  </small>
                </div>
              ))}
            </section>
            <section className="card saved">
              <div className="kicker">03 / SAVED MEALS</div>
              <div className="titleline">
                <h2>已存餐单</h2>
                <span className="count">{j.saved.length} 餐</span>
              </div>
              {!j.saved.length ? (
                <p className="hint">
                  今天还没有餐单。保存第一餐后，份量和预算会一起记在这里。
                </p>
              ) : (
                slots.map((s) => {
                  const m = j.saved.find((x) => x.slot === s);
                  if (!m) return null;
                  return (
                    <details key={s}>
                      <summary>
                        {slotNames[s]}{" "}
                        <span>
                          {fmt(totals(m.portions, foods).kcal, "kcal")} kcal
                        </span>
                      </summary>
                      <MealDetails meal={m} />
                      <button
                        onClick={() => {
                          selectSlot(s);
                          document.getElementById("top")?.scrollIntoView();
                        }}
                      >
                        编辑{slotNames[s]}
                      </button>{" "}
                      <button
                        onClick={() => {
                          setJ((state) => ({
                            ...state,
                            saved: state.saved.filter((i) => i.slot !== s),
                          }));
                          setError("");
                          setNotice(`${slotNames[s]}已移除。`);
                        }}
                      >
                        移除{slotNames[s]}
                      </button>
                    </details>
                  );
                })
              )}
            </section>
          </aside>
        </div>
        <footer>
          <span>MealFit · 仅在此浏览器保存 · 营养估算非医疗建议</span>
          <button
            className="textbtn"
            onClick={() => {
              if (window.confirm("清除今日餐单、偏好及目标？")) {
                setJ(fresh(dayKey(), DATA_VERSION));
                setDraft(null);
                setError("");
                setSettings(false);
                setNotice("本地餐单与设置已重置。");
              }
            }}
          >
            清除本地记录
          </button>
        </footer>
      </main>
    </>
  );
}
