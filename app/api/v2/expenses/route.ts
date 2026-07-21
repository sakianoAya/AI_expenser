import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"

const expenseInput = z.object({
  id: z.string().uuid().optional(),
  amount: z.coerce.number().positive().max(999999999999),
  category_key: z.string().min(1).max(80),
  currency: z.enum(["TWD", "JPY", "USD", "EUR"]),
  description: z.string().trim().max(500).nullable().optional(),
  receipt_url: z.string().url().nullable().optional(),
  expense_date: z.string().date(),
})

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get("month")
    const supabase = createAdminClient()
    let query = supabase.from("expenses_v2").select("*, categories_v2!expenses_v2_category_key_fkey(name_zh,name_en,icon,color)").order("expense_date", { ascending: false }).order("created_at", { ascending: false })
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, value] = month.split("-").map(Number)
      const start = `${month}-01`
      const end = new Date(year, value, 0).toISOString().split("T")[0]
      query = query.gte("expense_date", start).lte("expense_date", end)
    }
    const [{ data, error }, categories] = await Promise.all([query, supabase.from("categories_v2").select("*").eq("is_active", true).order("sort_order")])
    if (error) throw error
    return NextResponse.json({ expenses: data || [], categories: categories.data || [] })
  } catch (error) { return NextResponse.json({ error: String(error) }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    const input = expenseInput.parse(await request.json())
    const values = { ...input }
    delete values.id
    const { data, error } = await createAdminClient().from("expenses_v2").insert({ ...values, migration_status: "native" }).select().single()
    if (error) throw error
    return NextResponse.json({ expense: data }, { status: 201 })
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? error.flatten() : String(error) }, { status: 400 }) }
}

export async function PATCH(request: NextRequest) {
  try {
    const input = expenseInput.extend({ id: z.string().uuid() }).parse(await request.json())
    const { id, ...values } = input
    const { data, error } = await createAdminClient().from("expenses_v2").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id).select().single()
    if (error) throw error
    return NextResponse.json({ expense: data })
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? error.flatten() : String(error) }, { status: 400 }) }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  const { error } = await createAdminClient().from("expenses_v2").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
