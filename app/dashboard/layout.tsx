import { BottomNav } from "@/components/bottom-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-background">
      <main className="app-shell pb-28">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
