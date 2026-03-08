import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { subscription, notificationTime, notificationMessage } = await request.json()

    if (!subscription) {
      return NextResponse.json({ error: "Missing subscription data" }, { status: 400 })
    }

    // Upsert the subscription and preferences into the profiles table
    // (Ensure your Supabase profiles table has these columns created)
    const { error } = await supabase
      .from("profiles")
      .update({
        push_subscription: subscription,
        notification_time: notificationTime || "20:00", // Default 8 PM
        notification_message: notificationMessage || "記得記錄今天的花費喔！",
      })
      .eq("id", user.id)

    if (error) {
      console.error("Supabase profile update error:", error)
      return NextResponse.json({ error: "Database update failed" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Push subscription error:", error)
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
  }
}
