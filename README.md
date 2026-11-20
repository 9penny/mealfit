# MealFit

**Choose your carbs and protein. MealFit completes the meal.**

MealFit is an open-source, deterministic meal planner focused on low-effort eating. Users build **one meal at a time**, choose its primary carbohydrate and protein sources, and receive automatically selected complementary foods and gram amounts. Meals share a daily calorie and protein budget.

## Principles
- **Meal-first workflow:** breakfast, lunch and dinner are generated and saved independently; never require all three to be selected up front.
- **Two main inputs:** primary carbohydrate and protein source for the selected meal.
- **Daily constraints:** calorie target and protein minimum/target, updated as meals are saved or edited.
- **Automatic completion:** choose other foods to improve nutrient coverage, convenience and affordability.
- **No AI in MVP:** deterministic, explainable calculations with reproducible tests.
- **Zero-cook first:** prioritize ready-to-eat foods, with optional cooked or pre-prepared choices.
- **Transparency:** show food grams, nutrient contributions, source data, assumptions, and unmet/unknown targets.

See [Product requirements](docs/PRD.md), [Architecture](docs/ARCHITECTURE.md), and [Codex handoff](docs/CODEX_TASK.md).

## Proposed stack
React + TypeScript + Vite, local versioned food data, localStorage, unit tests, static GitHub Pages deployment. No backend or external AI dependency required.

## Status
Specification phase; implementation pending.

## Safety
Nutrition estimates are approximate, not medical advice. Calorie/protein targets are user-adjustable and should not be represented as individualized medical prescriptions.
