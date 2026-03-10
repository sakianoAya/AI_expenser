"use client"

import { useLocale } from "@/lib/locale-context"
import { formatCurrency } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { getCategoryIcon } from "@/lib/category-icons"
import { OWNER_ID } from "@/lib/constants"
import { Plus, Globe, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"

type Profile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  preferred_currency: string
  preferred_locale: string
  monthly_budget: number
}

async function fetchDashboardData() {
  const supabase = createClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const today = now.toISOString().split("T")[0]

  const [expensesRes, categoriesRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("*, categories(name_zh, name_en, icon, color)")
      .eq("user_id", OWNER_ID)
      .gte("expense_date", monthStart)
      .order("expense_date", { ascending: false })
      .limit(10),
    supabase.from("categories").select("*").eq("user_id", OWNER_ID).order("sort_order"),
  ])

  const expenses = expensesRes.data || []
  const todayExpenses = expenses.filter((e) => e.expense_date === today)
  const todayTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const monthTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return { expenses, todayTotal, monthTotal, categories: categoriesRes.data || [] }
}

export function DashboardHome({ profile }: { profile: Profile | null }) {
  const { t, locale, setLocale, currency } = useLocale()
  const { data, isLoading } = useSWR("dashboard-data", fetchDashboardData, {
    refreshInterval: 30000,
  })

  const budget = profile?.monthly_budget || 0
  const remaining = budget - (data?.monthTotal || 0)
  const budgetPercent = budget > 0 ? Math.min(((data?.monthTotal || 0) / budget) * 100, 100) : 0
  const displayName = profile?.display_name || "Me"

  return (
    <div className="flex flex-col gap-5 p-4 pt-safe-top">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t.home.greeting},</p>
          <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocale(locale === "zh-TW" ? "en" : "zh-TW")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
            aria-label="Toggle language"
          >
            <Globe className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1 rounded-[2rem] bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-lg shadow-primary/30 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <span className="text-xs font-medium opacity-80">{t.home.todaySpent}</span>
          <span className="text-3xl font-extrabold tracking-tight mt-1">
            {isLoading ? "..." : formatCurrency(data?.todayTotal || 0, currency, locale)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-[2rem] bg-gradient-to-br from-card to-muted/30 p-5 shadow-md border border-border/50 relative overflow-hidden">
          <span className="text-xs font-medium text-muted-foreground">{t.home.monthSpent}</span>
          <span className="text-2xl font-bold text-foreground mt-1">
            {isLoading ? "..." : formatCurrency(data?.monthTotal || 0, currency, locale)}
          </span>
        </div>
      </div>

      {/* Budget Progress */}
      {budget > 0 && (
        <div className="flex flex-col gap-3 rounded-[2rem] bg-card p-5 shadow-lg shadow-black/5 border border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{t.home.budget}</span>
            <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">
              {formatCurrency(budget, currency, locale)}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-secondary/80 inner-shadow-sm">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${budgetPercent}%`,
                background: budgetPercent > 80 
                  ? "linear-gradient(to right, var(--destructive), color-mix(in oklch, var(--destructive) 80%, white))" 
                  : budgetPercent > 50 
                    ? "linear-gradient(to right, var(--warning), color-mix(in oklch, var(--warning) 80%, white))" 
                    : "linear-gradient(to right, var(--primary), color-mix(in oklch, var(--primary) 60%, white))",
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">{t.home.remaining}</span>
            <span className={`text-sm font-bold ${remaining < 0 ? "text-destructive" : "text-primary"}`}>
              {formatCurrency(remaining, currency, locale)}
            </span>
          </div>
        </div>
      )}

      {/* Quick Add Button */}
      <Link
        href="/dashboard/expenses?add=true"
        className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all duration-300 active:scale-[0.97]"
      >
        <Plus className="h-5 w-5" />
        {t.home.quickAdd}
      </Link>

      {/* Recent Expenses */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{t.home.recentExpenses}</h2>
          <Link href="/dashboard/expenses" className="text-sm text-primary font-medium">
            {locale === "zh-TW" ? "查看全部" : "View all"}
          </Link>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary/50" />
            ))}
          </div>
        ) : !data?.expenses.length ? (
          <div className="flex flex-col items-center gap-3 rounded-[2rem] bg-card py-10 border border-border/50 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t.home.noExpenses}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.expenses.slice(0, 5).map((expense) => {
              const cat = expense.categories as { name_zh: string; name_en: string; icon: string; color: string } | null
              const Icon = getCategoryIcon(cat?.icon || "")
              return (
                <Link
                  key={expense.id}
                  href={`/dashboard/expenses?edit=${expense.id}`}
                  className="group flex items-center gap-4 rounded-2xl bg-card p-4 border border-border/40 shadow-sm transition-all duration-300 active:scale-[0.98] active:bg-secondary/50"
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-active:scale-95"
                    style={{ backgroundColor: cat?.color ? `${cat.color}15` : "var(--secondary)" }}
                  >
                    <Icon className="h-6 w-6" style={{ color: cat?.color || "var(--foreground)" }} />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-bold text-foreground">
                      {locale === "zh-TW" ? cat?.name_zh : cat?.name_en || expense.description || ""}
                    </span>
                    {expense.description && (
                      <span className="text-xs font-medium text-muted-foreground line-clamp-1">{expense.description}</span>
                    )}
                  </div>
                  <span className="text-base font-bold text-foreground">
                    -{formatCurrency(Number(expense.amount), currency, locale)}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
