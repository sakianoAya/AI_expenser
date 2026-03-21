import { createClient } from "@/lib/supabase/server"
import { OWNER_ID } from "@/lib/constants"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Rename '飲食' to '外食'
    await supabase
      .from("categories")
      .update({ name_zh: "外食", name_en: "Food", icon: "utensils" })
      .eq("user_id", OWNER_ID)
      .eq("name_zh", "飲食")

    // 2. The 11 required categories
    const REQUIRED_CATEGORIES = [
      { name_zh: "外食", name_en: "Food", icon: "utensils", color: "#ef4444", group_name: "all", sort_order: 1 },
      { name_zh: "食材", name_en: "Groceries", icon: "carrot", color: "#22c55e", group_name: "all", sort_order: 2 },
      { name_zh: "交通", name_en: "Transport", icon: "car", color: "#f97316", group_name: "all", sort_order: 3 },
      { name_zh: "日用品", name_en: "Daily", icon: "shopping-bag", color: "#84cc16", group_name: "all", sort_order: 4 },
      { name_zh: "娛樂", name_en: "Entertainment", icon: "gamepad-2", color: "#06b6d4", group_name: "all", sort_order: 5 },
      { name_zh: "購物", name_en: "Shopping", icon: "shopping-cart", color: "#8b5cf6", group_name: "all", sort_order: 6 },
      { name_zh: "約會", name_en: "Dating", icon: "heart", color: "#f43f5e", group_name: "all", sort_order: 7 },
      { name_zh: "房租", name_en: "Rent", icon: "building", color: "#64748b", group_name: "all", sort_order: 8 },
      { name_zh: "保險", name_en: "Insurance", icon: "shield", color: "#0d9488", group_name: "all", sort_order: 9 },
      { name_zh: "訂閱", name_en: "Subscription", icon: "repeat", color: "#7c3aed", group_name: "all", sort_order: 10 },
      { name_zh: "水電", name_en: "Utilities", icon: "zap", color: "#eab308", group_name: "all", sort_order: 11 },
    ]

    const { data: existing } = await supabase.from("categories").select("name_zh").eq("user_id", OWNER_ID)
    const existingNames = new Set(existing?.map((c) => c.name_zh) || [])

    const missing = REQUIRED_CATEGORIES.filter((c) => !existingNames.has(c.name_zh)).map((c) => ({
      ...c,
      user_id: OWNER_ID,
      is_default: true,
    }))

    if (missing.length > 0) {
      await supabase.from("categories").insert(missing)
    }

    return NextResponse.json({ success: true, missingCount: missing.length })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
