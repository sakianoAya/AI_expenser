import { createClient } from "@/lib/supabase/server"
import { OWNER_ID } from "@/lib/constants"
import { DashboardHome } from "@/components/dashboard-home"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", OWNER_ID)
    .single()

  return <DashboardHome profile={profile} />
}
