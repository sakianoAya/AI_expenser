export const CATEGORY_PRESENTATION: Record<string, { zh: string; en: string; group: string }> = {
  Food: { zh: "餐飲", en: "Food", group: "餐飲" },
  Groceries: { zh: "食材", en: "Groceries", group: "餐飲" },
  Transport: { zh: "交通", en: "Transport", group: "交通" },
  Daily: { zh: "日用品", en: "Daily essentials", group: "生活" },
  Shopping: { zh: "購物", en: "Shopping", group: "生活" },
  Entertainment: { zh: "娛樂", en: "Entertainment", group: "娛樂" },
  Rent: { zh: "房租", en: "Rent", group: "居住" },
  Housing: { zh: "居住", en: "Housing", group: "居住" },
  Utilities: { zh: "水電網路", en: "Utilities", group: "居住" },
  Insurance: { zh: "保險", en: "Insurance", group: "財務" },
  Subscription: { zh: "訂閱", en: "Subscription", group: "財務" },
  Dating: { zh: "約會", en: "Dating", group: "待整理" },
  Other: { zh: "其他", en: "Other", group: "其他" },
}

export function getCategoryLabel(category: { name_zh?: string | null; name_en?: string | null } | null, locale: "zh-TW" | "en") {
  if (!category) return locale === "zh-TW" ? "未分類" : "Uncategorized"
  const presentation = category.name_en ? CATEGORY_PRESENTATION[category.name_en] : undefined
  if (presentation) return locale === "zh-TW" ? presentation.zh : presentation.en
  return locale === "zh-TW" ? category.name_zh || category.name_en || "未分類" : category.name_en || category.name_zh || "Uncategorized"
}
