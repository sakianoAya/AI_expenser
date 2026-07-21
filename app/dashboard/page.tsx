import { createAdminClient } from "@/lib/supabase/admin"
import { DashboardHome } from "@/components/dashboard-home"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from("app_settings_v2")
    .select("*")
    .eq("singleton_id", 1)
    .single()

  return <DashboardHome profile={profile} />
}
