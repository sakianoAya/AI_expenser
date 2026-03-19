"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Receipt, BarChart3, CalendarDays, Sparkles, Settings } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", icon: Home, labelKey: "home" as const },
  { href: "/dashboard/expenses", icon: Receipt, labelKey: "expenses" as const },
  { href: "/dashboard/analytics", icon: BarChart3, labelKey: "analytics" as const },
  { href: "/dashboard/schedule", icon: CalendarDays, labelKey: "schedule" as const },
  { href: "/dashboard/advisor", icon: Sparkles, labelKey: "advisor" as const },
  { href: "/dashboard/settings", icon: Settings, labelKey: "settings" as const },
]

export function BottomNav() {
  const pathname = usePathname()
  const { t } = useLocale()

  return (
    <div 
      className="fixed inset-x-0 bottom-0 z-50 pointer-events-auto border-t border-border/50 bg-background/80 shadow-[0_-10px_30px_rgb(0,0,0,0.05)] backdrop-blur-2xl dark:bg-card/80 dark:shadow-black/20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <nav className="mx-auto flex h-16 w-full max-w-md items-center justify-around px-2">
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
                "relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 px-3 py-1 transition-all duration-300 active:scale-90",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-in fade-in zoom-in duration-300" />
              )}
              <item.icon className={cn("relative z-10 h-5 w-5 transition-transform duration-300", isActive && "stroke-[2.5] scale-110")} />
              <span className="relative z-10 text-[10px] font-medium">{t.nav[item.labelKey]}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
