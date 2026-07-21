import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"

const settingsInput = z.object({ preferred_currency: z.enum(["TWD", "JPY", "USD", "EUR"]).optional(), preferred_locale: z.enum(["zh-TW", "en"]).optional(), monthly_budget: z.coerce.number().min(0).optional(), push_subscription: z.unknown().optional(), notification_time: z.string().regex(/^\d{2}:\d{2}$/).optional(), notification_message: z.string().max(200).optional() })

export async function GET() {
  const { data, error } = await createAdminClient().from("app_settings_v2").select("*").eq("singleton_id", 1).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data })
}

export async function PATCH(request: NextRequest) {
  try {
    const values = settingsInput.parse(await request.json())
    const { data, error } = await createAdminClient().from("app_settings_v2").update({ ...values, updated_at: new Date().toISOString() }).eq("singleton_id", 1).select().single()
    if (error) throw error
    return NextResponse.json({ settings: data })
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? error.flatten() : String(error) }, { status: 400 }) }
}
