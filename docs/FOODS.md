# 食材目录：怎样称量，数值从哪里来

版本 `mealfit-1.0.0+sr-legacy.2018-04`。每个数值对应 **100 克可食部分**，不是每包或每份。举例：80 克沥油后连软骨的沙丁鱼，钙估算为 `382 × 80 / 100 = 305.6 mg`；不要用罐头标的总净重计算。

## 数据来源与复核

数据来自美国农业部 [FoodData Central 下载页](https://fdc.nal.usda.gov/download-datasets/) 的 [SR Legacy，2018 年 4 月最终版 CSV](https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip)。本版下载并核对了原包，SHA-256 为 `b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0`。运行应用不需要联网或 API 密钥。

在数据包中，用下表的 `fdc_id` 查 `food.csv` 核对食物描述，再在 `food_nutrient.csv` 用 `(fdc_id, nutrient_id)` 取 `amount`；单位见 `nutrient.csv`。例如 `(175139, 1087)` 对应上述沙丁鱼钙值 `382`。库中既有检测结果也有文献、推算或假定值；这里保留来源报告的 0，不把缺行、空值或未区分的组分填成 0。

| 字段 | USDA nutrient_id | 单位 / 100 g |
|---|---|---|
| kcal / protein / carbs / fat | 1008 / 1003 / 1005 / 1004 | kcal / g / g / g |
| fiber | 1079（总膳食纤维） | g |
| calcium / iron / sodium | 1087 / 1089 / 1093 | mg |
| vitaminC | 1162（总抗坏血酸） | mg |
| vitaminD / b12 | 1114（D₂+D₃，非 IU） / 1178 | μg |
| omega3 | 1404（ALA）+ 1278（EPA）+ 1272（DHA） | g；三项均有记录才相加 |

`omega3` 在本目录**仅指这三种脂肪酸之和**，不是全部 n-3 脂肪酸，也不是 EPA+DHA。金枪鱼为 `0.002 + 0.028 + 0.196 = 0.226 g`。原始资料有时只报告「18:3，未区分异构体」，不将它等同于 ALA。因此核桃、沙丁鱼等项的 `omega3` 是 `null`；这不表示它们没有 Omega-3。牛腱的维生素 D 也缺记录。目录没有用另一种食物或相邻条目的数值补洞。

## 食材对照

链接指向对应的 USDA 条目。美国产通用样品是估算依据，不是对中国某品牌产品的检测。尤其是即食米饭、鸡胸、乳清、豆腐和强化奶，需核对产品的配方、食用说明与营养标签。

| 目录 ID | USDA FDC ID | 所选样品和称重口径 |
|---|---:|---|
| rice | [169757](https://fdc.nal.usda.gov/food-details/169757/nutrients) | 无强化、无盐长粒熟白米；用作无油盐即食熟饭的近似值，非干米或自热米饭 |
| bread | [172688](https://fdc.nal.usda.gov/food-details/172688/nutrients) | 市售全麦面包，未经再次烘烤 |
| oats | [173904](https://fdc.nal.usda.gov/food-details/173904/nutrients) | 普通或快熟、未强化的燕麦片，按干重，不按粥重 |
| banana | [173944](https://fdc.nal.usda.gov/food-details/173944/nutrients) | 生香蕉果肉，不含果皮 |
| chicken | [171477](https://fdc.nal.usda.gov/food-details/171477/nutrients) | 烤鸡胸纯肉，去皮熟重；作为原味、允许冷食成品的近似值 |
| egg | [173424](https://fdc.nal.usda.gov/food-details/173424/nutrients) | 水煮全蛋，去壳熟重；不含腌制液 |
| whey | [173180](https://fdc.nal.usda.gov/food-details/173180/nutrients) | 乳清基蛋白粉，干粉；非液态乳清，冲调水不入分母 |
| sardines | [175139](https://fdc.nal.usda.gov/food-details/175139/nutrients) | 大西洋沙丁鱼，油浸罐头、沥油、含软骨 |
| tuna | [173709](https://fdc.nal.usda.gov/food-details/173709/nutrients) | 水浸淡色金枪鱼罐头，沥去罐液；不是长鳍白金枪鱼 |
| beef-shank | [169442](https://fdc.nal.usda.gov/food-details/169442/nutrients) | 慢炖牛腱横切（choice），仅取可分离的熟瘦肉 |
| tofu | [172448](https://fdc.nal.usda.gov/food-details/172448/nutrients) | 硫酸钙及氯化镁点制的硬豆腐；原始数据也说明凝固剂会影响钙含量 |
| milk | [172217](https://fdc.nal.usda.gov/food-details/172217/nutrients) | 全脂牛奶，未添加维生素 A 或 D |
| milk-fortified | [171265](https://fdc.nal.usda.gov/food-details/171265/nutrients) | 全脂牛奶，添加维生素 D；不代表每种强化奶的添加量 |
| tomato | [170457](https://fdc.nal.usda.gov/food-details/170457/nutrients) | 红色成熟鲜番茄，全年平均 |
| cucumber | [168409](https://fdc.nal.usda.gov/food-details/168409/nutrients) | 带皮生黄瓜 |
| carrot | [170393](https://fdc.nal.usda.gov/food-details/170393/nutrients) | 生胡萝卜，可食部分 |
| orange | [169097](https://fdc.nal.usda.gov/food-details/169097/nutrients) | 生甜橙，可食部分，商业品种综合值 |
| almonds | [170567](https://fdc.nal.usda.gov/food-details/170567/nutrients) | 扁桃仁（巴旦木仁），不含硬壳，不是苦杏仁 |
| walnuts | [170187](https://fdc.nal.usda.gov/food-details/170187/nutrients) | 核桃仁（English walnuts），不含硬壳 |

## 搭配限制

- **零烹饪**指本餐不需要加热；可洗、剥、切、沥干、称重或用饮用水冲调。熟重不等于可冷食：鸡胸、米饭、豆腐和水煮蛋的零烹饪标记只适用于已熟且适合直接食用的产品，以实际标签和保存条件为准。需煮燕麦片与自炖牛腱不进入零烹饪候选。生肉、需要复热的冷冻品不按即食品处理。
- **过敏排除**按条目标签匹配。乳清和牛奶共用「牛奶」，两种鱼罐头共用「鱼类」，巴旦木与核桃共用「树坚果」。未核验无麸质认证的普通燕麦保守纳入「麸质」排除；这不代表燕麦本身就是小麦。空数组只表示所描述的基础配料没有已标注项，非无过敏原认证。看实际包装上的其他配料及交叉接触提醒，不匹配时直接排除该食材。参见 [FDA 食品过敏原与标签](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies)。
- **鱼类**仅作可选主蛋白，不作自动补充食材或每日推荐。罐头钠随品牌、浸液而变；钙值只用于连软骨吃的沙丁鱼。汞随鱼种而异，备孕、孕期、哺乳期及儿童可参考 [FDA/EPA 食鱼建议](https://www.fda.gov/food/consumers/advice-about-eating-fish)：淡色金枪鱼罐头和沙丁鱼与长鳍白金枪鱼不属同一分组。
- **份量与成本**：`minG`、`maxG`、`stepG` 是单餐生成器的搜索范围与克数步长，不是每日摄入标准；`cost` 的 1、2、3 只表示粗略相对成本，不是实时报价。这些产品设置与 USDA 营养测定值分开维护。营养记录或估算口径变化时须提升 `DATA_VERSION`。
