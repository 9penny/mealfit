import type { Food } from '../domain/types'

export const DATA_VERSION = 'mealfit-1.0.0+sr-legacy.2018-04'
const usda = (fdcId: number) => `https://fdc.nal.usda.gov/food-details/${fdcId}/nutrients`

// Per 100 g edible portion, not per serving. See docs/FOODS.md for units and field IDs.
export const foods: Food[] = [
  {
    id: 'rice', name: '即食白米饭', role: 'carb', basis: '无盐长粒白米饭，熟重',
    zeroCook: true, allergens: [], minG: 80, maxG: 300, stepG: 20, cost: 1,
    source: usda(169757), notes: '选明确标注可直接食用的熟饭；需要微波或自热的产品不属于这项。按原味熟饭估算，不含酱汁。',
    per100: { kcal: 130, protein: 2.69, carbs: 28.17, fat: 0.28, fiber: 0.4, calcium: 10, iron: 0.2, sodium: 1, vitaminC: 0, vitaminD: 0, b12: 0, omega3: null },
  },
  {
    id: 'bread', name: '全麦面包', role: 'carb', basis: '市售全麦面包，未烘烤的切片重量',
    zeroCook: true, allergens: ['小麦', '麸质'], minG: 30, maxG: 150, stepG: 15, cost: 1,
    source: usda(172688), notes: '按切片实际克重计。核对配料和过敏提示，有些面包含牛奶、大豆、芝麻或坚果。',
    per100: { kcal: 252, protein: 12.45, carbs: 42.71, fat: 3.5, fiber: 6, calcium: 161, iron: 2.47, sodium: 455, vitaminC: 0, vitaminD: 0, b12: 0, omega3: 0.137 },
  },
  {
    id: 'oats', name: '原味燕麦片（需煮）', role: 'carb', basis: '未强化燕麦片，煮前干重',
    zeroCook: false, allergens: ['燕麦', '麸质'], minG: 30, maxG: 90, stepG: 10, cost: 1,
    source: usda(173904), notes: '先称干片，再按包装说明加水煮。普通燕麦有与含麸质谷物交叉接触的可能；本目录未核验无麸质认证。',
    per100: { kcal: 379, protein: 13.15, carbs: 67.7, fat: 6.52, fiber: 10.1, calcium: 52, iron: 4.25, sodium: 6, vitaminC: 0, vitaminD: 0, b12: 0, omega3: null },
  },
  {
    id: 'banana', name: '香蕉', role: 'carb', basis: '生鲜，去皮果肉重',
    zeroCook: true, allergens: [], minG: 60, maxG: 220, stepG: 20, cost: 1,
    source: usda(173944), notes: '剥皮后称重，果皮不计入份量。',
    per100: { kcal: 89, protein: 1.09, carbs: 22.84, fat: 0.33, fiber: 2.6, calcium: 5, iron: 0.26, sodium: 1, vitaminC: 8.7, vitaminD: 0, b12: 0, omega3: null },
  },
  {
    id: 'chicken', name: '即食鸡胸肉', role: 'protein', basis: '原味烤鸡胸，去皮去骨熟肉重',
    zeroCook: true, allergens: [], minG: 60, maxG: 200, stepG: 20, cost: 2,
    source: usda(171477), notes: '仅选已熟、标签允许冷食的原味鸡胸，按标签冷藏。盐水腌制品钠含量另计，调味汁还可能含大豆或小麦。',
    per100: { kcal: 165, protein: 31.02, carbs: 0, fat: 3.57, fiber: 0, calcium: 15, iron: 1.04, sodium: 74, vitaminC: 0, vitaminD: 0.1, b12: 0.34, omega3: null },
  },
  {
    id: 'egg', name: '即食水煮蛋', role: 'protein', basis: '全熟水煮蛋，去壳重',
    zeroCook: true, allergens: ['鸡蛋'], minG: 50, maxG: 150, stepG: 50, cost: 1,
    source: usda(173424), notes: '指已煮熟的原味鸡蛋，不是生鸡蛋。按包装要求保存；茶叶蛋、盐焗蛋的钠含量不同。',
    per100: { kcal: 155, protein: 12.58, carbs: 1.12, fat: 10.61, fiber: 0, calcium: 50, iron: 1.19, sodium: 124, vitaminC: 0, vitaminD: 2.2, b12: 1.11, omega3: null },
  },
  {
    id: 'whey', name: '乳清蛋白粉', role: 'protein', basis: '乳清基蛋白粉，冲调前干粉重',
    zeroCook: true, allergens: ['牛奶'], minG: 15, maxG: 45, stepG: 5, cost: 2,
    source: usda(173180), notes: '称干粉后用饮用水冲调；加牛奶需另计。乳清来自牛奶，部分配方还含大豆卵磷脂；蛋白含量以所购标签为准。',
    per100: { kcal: 352, protein: 78.13, carbs: 6.25, fat: 1.56, fiber: 3.1, calcium: 469, iron: 1.13, sodium: 156, vitaminC: 0, vitaminD: 0, b12: 2.45, omega3: null },
  },
  {
    id: 'sardines', name: '油浸沙丁鱼', role: 'protein', basis: '罐装大西洋沙丁鱼，沥油后连软骨重',
    zeroCook: true, allergens: ['鱼类'], minG: 50, maxG: 150, stepG: 25, cost: 2,
    source: usda(175139), notes: '沥去罐油，软骨一起吃才适用这项钙值。各品牌用盐量不同，比较标签上的钠。',
    per100: { kcal: 208, protein: 24.62, carbs: 0, fat: 11.45, fiber: 0, calcium: 382, iron: 2.92, sodium: 307, vitaminC: 0, vitaminD: 4.8, b12: 8.94, omega3: null },
  },
  {
    id: 'tuna', name: '水浸淡色金枪鱼', role: 'protein', basis: '淡色金枪鱼罐头，沥水后鱼肉重',
    zeroCook: true, allergens: ['鱼类'], minG: 50, maxG: 125, stepG: 25, cost: 2,
    source: usda(173709), notes: '选淡色罐头（light），不以长鳍白金枪鱼替代。注意钠和鱼种汞水平；与其他蛋白来源轮换，非每日建议。',
    per100: { kcal: 86, protein: 19.44, carbs: 0, fat: 0.96, fiber: 0, calcium: 17, iron: 1.63, sodium: 247, vitaminC: 0, vitaminD: 1.2, b12: 2.55, omega3: 0.226 },
  },
  {
    id: 'beef-shank', name: '清炖牛腱', role: 'protein', basis: '慢炖熟牛腱，去骨去可见脂肪后的瘦肉重',
    zeroCook: false, allergens: [], minG: 60, maxG: 180, stepG: 20, cost: 3,
    source: usda(169442), notes: '指需自行炖熟的原味牛腱，按熟肉称重，不含汤汁。市售酱牛肉盐分与这项不同。',
    per100: { kcal: 201, protein: 33.68, carbs: 0, fat: 6.36, fiber: 0, calcium: 32, iron: 3.86, sodium: 64, vitaminC: 0, vitaminD: null, b12: 3.79, omega3: null },
  },
  {
    id: 'tofu', name: '即食原味豆腐', role: 'protein', basis: '硬豆腐，硫酸钙与氯化镁点制，去包装水重',
    zeroCook: true, allergens: ['大豆'], minG: 80, maxG: 240, stepG: 20, cost: 1,
    source: usda(172448), notes: '仅用标签注明可直接冷食的产品。凝固剂和用量会改变钙含量，不用本项估算内酯豆腐。',
    per100: { kcal: 78, protein: 9.04, carbs: 2.85, fat: 4.17, fiber: 0.9, calcium: 201, iron: 1.61, sodium: 12, vitaminC: 0.2, vitaminD: 0, b12: 0, omega3: null },
  },
  {
    id: 'milk', name: '全脂纯牛奶', role: 'extra', basis: '未强化全脂牛奶，液体重量',
    zeroCook: true, allergens: ['牛奶'], minG: 100, maxG: 250, stepG: 50, cost: 1,
    source: usda(172217), notes: '选巴氏杀菌或超高温灭菌纯牛奶，按克而非毫升称量。按标签保存，开封后冷藏。',
    per100: { kcal: 61, protein: 3.15, carbs: 4.78, fat: 3.27, fiber: 0, calcium: 113, iron: 0.03, sodium: 43, vitaminC: 0, vitaminD: 0.1, b12: 0.45, omega3: null },
  },
  {
    id: 'milk-fortified', name: '维生素 D 强化全脂牛奶', role: 'extra', basis: '添加维生素 D 的全脂牛奶，液体重量',
    zeroCook: true, allergens: ['牛奶'], minG: 100, maxG: 250, stepG: 50, cost: 2,
    source: usda(171265), notes: '仅用于标有维生素 D 强化的杀菌奶；添加量随品牌而异，普通牛奶请选未强化项。',
    per100: { kcal: 61, protein: 3.15, carbs: 4.8, fat: 3.25, fiber: 0, calcium: 113, iron: 0.03, sodium: 43, vitaminC: 0, vitaminD: 1.3, b12: 0.45, omega3: null },
  },
  {
    id: 'tomato', name: '番茄', role: 'extra', basis: '生鲜红番茄，去蒂重',
    zeroCook: true, allergens: [], minG: 60, maxG: 200, stepG: 20, cost: 1,
    source: usda(170457), notes: '洗净去蒂后称重，切块即可；不含沙拉酱。',
    per100: { kcal: 18, protein: 0.88, carbs: 3.89, fat: 0.2, fiber: 1.2, calcium: 10, iron: 0.27, sodium: 5, vitaminC: 13.7, vitaminD: 0, b12: 0, omega3: null },
  },
  {
    id: 'cucumber', name: '黄瓜', role: 'extra', basis: '生鲜黄瓜，带皮可食部重',
    zeroCook: true, allergens: [], minG: 60, maxG: 200, stepG: 20, cost: 1,
    source: usda(168409), notes: '洗净带皮称重。这是鲜黄瓜，不是加盐腌制的酸黄瓜。',
    per100: { kcal: 15, protein: 0.65, carbs: 3.63, fat: 0.11, fiber: 0.5, calcium: 16, iron: 0.28, sodium: 2, vitaminC: 2.8, vitaminD: 0, b12: 0, omega3: null },
  },
  {
    id: 'carrot', name: '胡萝卜', role: 'extra', basis: '生鲜胡萝卜，可食部重',
    zeroCook: true, allergens: [], minG: 40, maxG: 160, stepG: 20, cost: 1,
    source: usda(170393), notes: '洗净去蒂，切条生食；熟制或加油请另计。',
    per100: { kcal: 41, protein: 0.93, carbs: 9.58, fat: 0.24, fiber: 2.8, calcium: 33, iron: 0.3, sodium: 69, vitaminC: 5.9, vitaminD: 0, b12: 0, omega3: null },
  },
  {
    id: 'orange', name: '鲜橙', role: 'extra', basis: '生鲜甜橙，去皮去籽果肉重',
    zeroCook: true, allergens: [], minG: 60, maxG: 200, stepG: 20, cost: 1,
    source: usda(169097), notes: '取整瓣果肉称重；榨汁或糖水罐头不适用。',
    per100: { kcal: 47, protein: 0.94, carbs: 11.75, fat: 0.12, fiber: 2.4, calcium: 40, iron: 0.1, sodium: 0, vitaminC: 53.2, vitaminD: 0, b12: 0, omega3: null },
  },
  {
    id: 'almonds', name: '原味巴旦木仁', role: 'extra', basis: '去硬壳扁桃仁，无盐原味',
    zeroCook: true, allergens: ['树坚果'], minG: 10, maxG: 30, stepG: 5, cost: 2,
    source: usda(170567), notes: '选原味食用扁桃仁，不是苦杏仁；不计硬壳。盐焗或糖衣款请核对标签。',
    per100: { kcal: 579, protein: 21.15, carbs: 21.55, fat: 49.93, fiber: 12.5, calcium: 269, iron: 3.71, sodium: 1, vitaminC: 0, vitaminD: 0, b12: 0, omega3: 0.003 },
  },
  {
    id: 'walnuts', name: '原味核桃仁', role: 'extra', basis: '去壳核桃仁，无盐原味',
    zeroCook: true, allergens: ['树坚果'], minG: 10, maxG: 30, stepG: 5, cost: 2,
    source: usda(170187), notes: '只称果仁。原始记录未区分全部所需的脂肪酸分项，未知不表示核桃不含 Omega-3。',
    per100: { kcal: 654, protein: 15.23, carbs: 13.71, fat: 65.21, fiber: 6.7, calcium: 98, iron: 2.91, sodium: 2, vitaminC: 1.3, vitaminD: 0, b12: 0, omega3: null },
  },
]
