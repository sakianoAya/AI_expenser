"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ReceiptText, BarChart3, Settings, Plus } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", icon: Home, labelKey: "home" as const },
  { href: "/dashboard/expenses", icon: ReceiptText, labelKey: "expenses" as const },
  { href: "/dashboard/analytics", icon: BarChart3, labelKey: "analytics" as const },
  { href: "/dashboard/settings", icon: Settings, labelKey: "settings" as const },
]

export function BottomNav() {
  const pathname = usePathname()
  const { t } = useLocale()

  return (
    <div 
      className="fixed inset-x-0 bottom-0 z-50 pointer-events-auto px-3 pb-2"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <nav className="surface-card relative mx-auto flex h-16 w-full max-w-md items-center justify-around rounded-[1.4rem] bg-card/90 px-2 backdrop-blur-2xl">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-[44px] min-w-[54px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-1 transition-all active:scale-95",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("relative z-10 h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className="relative z-10 text-[10px] font-semibold">{t.nav[item.labelKey]}</span>
            </Link>
          )
        })}
        <Link href="/dashboard/expenses?add=true" aria-label={t.expenses.add} className="absolute -top-8 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-[5px] border-background bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-95">
          <Plus className="h-6 w-6" />
        </Link>
      </nav>
    </div>
  )
}
