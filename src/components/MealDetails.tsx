import { foods } from "../data/foods";
import { nutrients, type Meal, type Nutrient } from "../domain/types";
import { totals } from "../engine/nutrition";
export const labels: Record<Nutrient, [string, string]> = {
  kcal: ["能量", "kcal"],
  protein: ["蛋白质", "g"],
  carbs: ["碳水", "g"],
  fat: ["脂肪", "g"],
  fiber: ["膳食纤维", "g"],
  calcium: ["钙", "mg"],
  iron: ["铁", "mg"],
  sodium: ["钠", "mg"],
  vitaminC: ["维生素 C", "mg"],
  vitaminD: ["维生素 D", "μg"],
  b12: ["维生素 B12", "μg"],
  omega3: ["Omega-3（ALA+EPA+DHA）", "g"],
};
export function fmt(n: number | null, k: Nutrient = "protein") {
  return n === null
    ? "未知"
    : new Intl.NumberFormat("zh-CN", {
        maximumFractionDigits: k === "kcal" ? 0 : 2,
      }).format(n);
}
export function MealDetails({
  meal,
  previous,
}: {
  meal: Meal;
  previous?: Meal;
}) {
  const t = totals(meal.portions, foods);
  const old = previous && totals(previous.portions, foods);
  return (
    <>
      <div className="pills">
        {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
          <span key={k}>
            {labels[k][0]} <b>{fmt(t[k], k)}</b> {labels[k][1]}
          </span>
        ))}
      </div>
      <ul className="ingredients">
        {meal.portions.map((p) => {
          const f = foods.find((f) => f.id === p.foodId)!;
          const values = totals([p], foods);
          return (
            <li key={f.id}>
              <div>
                <b>{f.name}</b>
                <strong>{p.grams} g</strong>
              </div>
              <p>{p.reason}</p>
              <details>
                <summary>营养与来源</summary>
                <p>
                  {f.basis} · {f.notes}
                </p>
                <p>
                  {nutrients
                    .map(
                      (k) =>
                        `${labels[k][0]} ${fmt(values[k], k)}${values[k] === null ? "" : ` ${labels[k][1]}`}`,
                    )
                    .join(" / ")}
                </p>
                <p className="source">
                  来源：
                  {f.source.startsWith("https://") ? (
                    <a href={f.source} target="_blank" rel="noreferrer">
                      {f.source}
                    </a>
                  ) : (
                    f.source
                  )}
                </p>
              </details>
            </li>
          );
        })}
      </ul>
      <details className="compare">
        <summary>
          {old ? "换餐对比 · 新方案减原方案" : "查看整餐营养合计"}
        </summary>
        <dl>
          {nutrients.map((k) => {
            const a = t[k],
              b = old?.[k];
            const delta = a !== null && b != null ? a - b : null;
            return (
              <div key={k}>
                <dt>{labels[k][0]}</dt>
                <dd>
                  {old ? `${fmt(b ?? null, k)} → ` : ""}
                  {fmt(a, k)} {labels[k][1]}{" "}
                  {old && (
                    <b>
                      {delta === null
                        ? "（差值未知）"
                        : `（${delta > 0 ? "+" : ""}${fmt(delta, k)}）`}
                    </b>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </details>
      <p className="hint">
        未知表示缺少成分数据，不等于零；本餐不评价微量营养素是否达标。
      </p>
    </>
  );
}
