import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"

const reminderInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  starts_at: z.string().datetime({ local: true }),
  ends_at: z.string().datetime({ local: true }).nullable().optional(),
  is_all_day: z.boolean().default(false),
  reminder_minutes: z.number().int().min(0).nullable().optional(),
  reminder_type: z.enum(["general", "bill", "subscription"]).default("general"),
  expected_amount: z.number().positive().nullable().optional(),
  category_key: z.string().max(80).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

function present(row: Record<string, unknown>) {
  return { ...row, start_time: row.starts_at, end_time: row.ends_at }
}

export async function GET(request: NextRequest) {
  const start = request.nextUrl.searchParams.get("start")
  const end = request.nextUrl.searchParams.get("end")
  if (!start || !end || !z.string().date().safeParse(start).success || !z.string().date().safeParse(end).success) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
  }
  const { data, error } = await createAdminClient().from("reminders_v2").select("*").gte("starts_at", `${start}T00:00:00`).lte("starts_at", `${end}T23:59:59`).order("starts_at")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reminders: (data || []).map(present) })
}

export async function POST(request: NextRequest) {
  try {
    const values = { ...reminderInput.parse(await request.json()) }
    delete values.id
    const { data, error } = await createAdminClient().from("reminders_v2").insert(values).select().single()
    if (error) throw error
    return NextResponse.json({ reminder: present(data) }, { status: 201 })
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? error.flatten() : String(error) }, { status: 400 }) }
}

export async function PATCH(request: NextRequest) {
  try {
    const input = reminderInput.extend({ id: z.string().uuid() }).parse(await request.json())
    const { id, ...values } = input
    const { data, error } = await createAdminClient().from("reminders_v2").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id).select().single()
    if (error) throw error
    return NextResponse.json({ reminder: present(data) })
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? error.flatten() : String(error) }, { status: 400 }) }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  const { error } = await createAdminClient().from("reminders_v2").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
