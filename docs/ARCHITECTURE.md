# Architecture and implementation guidance

## Stack
- React, TypeScript, Vite, Tailwind CSS (optional).
- Deterministic TypeScript nutrition engine, versioned local JSON/TS food records.
- Browser localStorage for settings and saved meals.
- Vitest for unit tests; optional Playwright smoke tests.
- Static deployment to GitHub Pages.

## Modules
- `src/data/foods.*`: versioned food nutrition and provenance, units per 100 g edible portion.
- `src/domain/types.ts`: Food, NutrientValues, Meal, DailyTargets, UserPreferences, SolverResult.
- `src/engine/nutrition.ts`: nutrient summation with explicit unknown handling.
- `src/engine/optimizer.ts`: deterministic candidate generation, portion adjustment and ranking.
- `src/engine/budget.ts`: saved meal totals and remaining daily targets.
- `src/components/`: daily dashboard, single-meal builder, food selector, meal result, swap comparison.

## Solver v1
1. Validate user choices and constraints.
2. Reserve already-saved meal totals; estimate a reasonable **provisional** budget for the selected meal based on remaining meals, without fixed equal splits.
3. Seed the meal with selected carb/protein, choose portions within safe bounds.
4. Add complementary foods from eligible catalog to improve daily nutrient coverage and calorie/protein fit.
5. Score candidates lexicographically: hard constraints, calorie/protein deviation, nutrient gaps, cost, prep effort, item count.
6. Return best feasible candidate plus explanations and unresolved nutrient gaps. Never silently modify other meals.
7. Recompute from scratch on swap; present deltas.

Start with bounded discrete serving increments and exhaustive/beam candidate search if tractable; introduce linear/mixed-integer optimization only if tests show the need. Avoid presenting heuristic output as mathematically optimal.

## Nutrition integrity
- Explicitly distinguish 0 from unknown/null.
- Show source/version and basis (raw/cooked/drained).
- Do not assert RDA compliance without an appropriate reference profile and data coverage.
- Keep calorie targets configurable; demo profile is not medical advice.
- Separate food constraints and allergies from user preferences.
- Check edge cases: no remaining kcal, protein target already met, infeasible food restrictions, swaps with higher fat, zero-cook restriction, fish/canned food limitations.

## Implementation order
1. Typed food model + curated dataset with credible citations and unit tests.
2. Nutrition and daily-budget math.
3. Single-meal deterministic solver + tests.
4. UI and local persistence.
5. Swap comparison, explanations, validation.
6. GitHub Pages workflow and documentation.
