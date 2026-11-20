# Codex handoff — Implement MealFit MVP

Implement the MVP described in [PRD](PRD.md) and [Architecture](ARCHITECTURE.md). The user has explicitly chosen **no AI** at this stage.

## Deliverables
- Working React/TypeScript/Vite application with responsive Chinese-language interface.
- User-adjustable daily kcal and protein targets.
- Single-meal generator: select meal, primary carb and primary protein; auto-complete complementary foods.
- Save/edit meals and share a live daily budget.
- Before/after swap nutrient deltas.
- Curated, documented food nutrition records with missing values represented honestly.
- Deterministic algorithm with infeasibility explanations, unit tests and README run instructions.
- GitHub Pages deploy workflow.

## Important product semantics
The user does **not** select all three meals at once. A meal is generated independently, while saved meals collectively obey a daily calorie/protein budget. Other micronutrients are secondary optimization objectives, not a guarantee. Zero-cook is a priority.

## Definition of done
`npm install && npm run build && npm test` succeed; app runs locally; selected foods are respected; saved meal totals are accurate; exclusions honored; unknown nutrient values are not silently treated as zero; deterministic tests pass.

Do not invent food composition values. Use reliable food composition sources and record provenance, or mark values unavailable.
