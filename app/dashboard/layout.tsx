import { BottomNav } from "@/components/bottom-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="flex-1 pb-36">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
