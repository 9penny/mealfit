# MealFit — Product Requirements (MVP)

## Problem
Existing food trackers demand too many manual decisions. MealFit lets a user choose the main carbohydrate and protein **for a single meal**; the app fills remaining foods and quantities to respect a shared daily calorie/protein budget while improving micronutrient coverage and reducing preparation work.

## Core experience
1. Set daily calorie target and protein target (editable; example demo 1,800 kcal and 120 g protein, not a universal recommendation).
2. Select breakfast/lunch/dinner (or a custom meal).
3. Select **one primary carbohydrate** and **one primary protein** from a curated food list.
4. Optionally enable zero-cook preference; exclusions/allergens must be respected.
5. Generate **only the selected meal**, with quantities and automatically chosen complements.
6. Display food-by-food kcal, protein, carbs, fats and known micronutrient contributions, plus meal totals.
7. Save or edit meal; update daily consumed and remaining calorie/protein budgets.
8. Generate another meal using the **remaining budget** and number of meals the user expects to eat.
9. Replace a primary source or regenerate; show changes in kcal, protein, fats and relevant micronutrients, including nutrients that become deficient or unknown.

## Constraints and prioritization
- Hard: dietary exclusions/allergies; food min/max portions; nonnegative quantities; do not silently exceed daily calorie budget; user-selected main sources retained unless infeasible.
- Daily calorie target is a tolerance/range, not exact equality; protein is a minimum/target with a reasonable upper guardrail.
- Existing saved meals are fixed unless the user explicitly edits them.
- Soft: micronutrient adequacy, few foods, minimal prep, low cost, palatability and variety.
- **Do not require every individual meal to meet every daily micronutrient target.** Prefer addressing gaps over the day.
- If constraints conflict, report infeasibility and suggested adjustments; never fabricate a compliant result.

## Food model
Per 100 g edible portion: kcal, protein, carbs, fat, fiber; optional calcium, iron, zinc, magnesium, iodine, vitamins A/D/E/B12/C, omega-3 EPA/DHA/ALA, sodium; preparation category, allergen tags, typical serving limits, price estimate and source/provenance. Nutrients missing from the database must be represented as **unknown**, not zero or adequate. Account for cooked vs raw weight and canned drained weight.

Initial options: oats, ready-to-eat rice, wholegrain bread, banana; whey protein, eggs (ready-boiled), canned sardines, canned tuna, ready-to-eat chicken breast, cooked beef shank; milk (regular/fortified), tomatoes, cucumbers, carrots, oranges, almonds, walnuts. Include appropriate alternatives and food safety notes. No automatic daily tuna recommendation; account for fish mercury, canned sodium and allergens.

## UX
- Primary screen: daily kcal/protein progress + single-meal builder.
- Output: editable meal card, per-food grams, nutrition contribution, reason each complementary food was selected.
- Swap comparison: before/after nutrient deltas and daily remaining budget.
- Explicit warnings for missing nutrient data and infeasible combinations.
- Responsive mobile-first interface; Chinese UI first, internationalization-ready.
- Persist settings and meals locally; provide reset/clear.

## Acceptance criteria
- One meal can be generated and saved without selecting the other meals.
- Changing carb/protein sources recomputes that meal, preserving other saved meals.
- Daily totals are exactly the sum of saved meal values; remaining budget updates correctly.
- Every displayed nutrient amount is derived from versioned food records and gram quantities.
- Repeated identical inputs produce identical output.
- Allergens/excluded foods never appear in generated results.
- No claims of micronutrient completeness where records are missing.
- Infeasible inputs generate actionable errors.
- Unit tests cover nutrient math, swapping, constraints, daily budget, missing nutrient data and persistence.
- No AI services, keys, backend or accounts required.
