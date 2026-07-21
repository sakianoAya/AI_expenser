"use client"

import Link from "next/link"
import useSWR from "swr"
import { ArrowUpRight, ChevronRight, CircleGauge, ReceiptText, Sparkles, WalletCards } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import { formatCurrency } from "@/lib/format"
import { getCategoryIcon } from "@/lib/category-icons"
import { getCategoryLabel } from "@/lib/category-taxonomy"

type Profile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  preferred_currency: string
  preferred_locale: string
  monthly_budget: number
}

type DashboardExpense = { id: string; amount: number; description: string | null; expense_date: string; categories: { name_zh: string; name_en: string; icon: string; color: string } | null }

async function fetchDashboardData() {
  const now = new Date()
  const today = now.toISOString().split("T")[0]
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const response = await fetch(`/api/v2/expenses?month=${month}`)
  if (!response.ok) throw new Error("Unable to load expenses")
  const payload = await response.json()
  const expenses = (payload.expenses || []).map((expense: Record<string, unknown>) => ({ ...expense, categories: expense.categories_v2 })) as DashboardExpense[]
  return {
    expenses,
    todayTotal: expenses.filter((expense) => expense.expense_date === today).reduce((sum, expense) => sum + Number(expense.amount), 0),
    monthTotal: expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
  }
}

export function DashboardHome({ profile }: { profile: Profile | null }) {
  const { locale, currency } = useLocale()
  const { data, isLoading } = useSWR("dashboard-data", fetchDashboardData, { refreshInterval: 30000 })
  const monthTotal = data?.monthTotal || 0
  const budget = Number(profile?.monthly_budget || 0)
  const remaining = budget - monthTotal
  const budgetPercent = budget > 0 ? Math.min((monthTotal / budget) * 100, 100) : 0
  const now = new Date()
  const monthLabel = new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-US", { month: "long" }).format(now)

  return (
    <div className="flex flex-col gap-7 px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{locale === "zh-TW" ? `${monthLabel}的財務概況` : `${monthLabel} overview`}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{locale === "zh-TW" ? "我的日常帳本" : "My daily money"}</h1>
        </div>
        <Link href="/dashboard/settings" className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary" aria-label="Settings">
          <WalletCards className="h-5 w-5" />
        </Link>
      </header>

      <section className="relative overflow-hidden rounded-[1.75rem] bg-primary p-6 text-primary-foreground shadow-xl shadow-primary/15">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 right-16 h-36 w-36 rounded-full bg-black/5" />
        <p className="text-sm font-medium text-primary-foreground/75">{locale === "zh-TW" ? "本月已支出" : "Spent this month"}</p>
        <p className="mt-2 text-[2.5rem] font-bold leading-none tracking-[-0.04em]">
          {isLoading ? "—" : formatCurrency(monthTotal, currency, locale)}
        </p>
        <div className="mt-6 flex items-end justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex justify-between text-xs font-medium text-primary-foreground/75">
              <span>{budget > 0 ? (locale === "zh-TW" ? "預算進度" : "Budget used") : (locale === "zh-TW" ? "尚未設定月預算" : "No budget yet")}</span>
              {budget > 0 && <span>{Math.round(budgetPercent)}%</span>}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${budgetPercent}%` }} />
            </div>
          </div>
          <Link href="/dashboard/analytics" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
            <ArrowUpRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="surface-card rounded-2xl p-4">
          <ReceiptText className="h-5 w-5 text-primary" />
          <p className="mt-4 text-xs font-medium text-muted-foreground">{locale === "zh-TW" ? "今天花費" : "Today"}</p>
          <p className="mt-1 text-lg font-bold">{isLoading ? "—" : formatCurrency(data?.todayTotal || 0, currency, locale)}</p>
        </div>
        <div className="surface-card rounded-2xl p-4">
          <CircleGauge className="h-5 w-5 text-accent" />
          <p className="mt-4 text-xs font-medium text-muted-foreground">{locale === "zh-TW" ? "預算剩餘" : "Remaining"}</p>
          <p className={`mt-1 text-lg font-bold ${remaining < 0 ? "text-destructive" : ""}`}>{budget > 0 ? formatCurrency(remaining, currency, locale) : "—"}</p>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{locale === "zh-TW" ? "最近動態" : "Activity"}</p>
            <h2 className="mt-1 text-lg font-bold">{locale === "zh-TW" ? "最近支出" : "Recent expenses"}</h2>
          </div>
          <Link href="/dashboard/expenses" className="flex items-center gap-1 text-sm font-semibold text-primary">{locale === "zh-TW" ? "全部" : "All"}<ChevronRight className="h-4 w-4" /></Link>
        </div>

        <div className="surface-card overflow-hidden rounded-[1.4rem]">
          {isLoading ? (
            <div className="space-y-3 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-secondary" />)}</div>
          ) : !data?.expenses.length ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ReceiptText className="h-6 w-6" /></div>
              <p className="mt-4 font-semibold">{locale === "zh-TW" ? "從第一筆支出開始" : "Start with your first expense"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{locale === "zh-TW" ? "點擊下方＋，手動輸入或掃描收據。" : "Tap + to enter it or scan a receipt."}</p>
            </div>
          ) : data.expenses.slice(0, 5).map((expense, index) => {
            const category = expense.categories as { name_zh: string; name_en: string; icon: string; color: string } | null
            const Icon = getCategoryIcon(category?.icon || "")
            return (
              <Link key={expense.id} href={`/dashboard/expenses?edit=${expense.id}`} className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/50 ${index ? "border-t border-border/70" : ""}`}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: category?.color ? `${category.color}18` : "var(--secondary)" }}>
                  <Icon className="h-5 w-5" style={{ color: category?.color || "var(--primary)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{expense.description || getCategoryLabel(category, locale)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{getCategoryLabel(category, locale)}</p>
                </div>
                <p className="text-sm font-bold">-{formatCurrency(Number(expense.amount), currency, locale)}</p>
              </Link>
            )
          })}
        </div>
      </section>

      <Link href="/dashboard/advisor" className="surface-card flex items-center gap-4 rounded-2xl p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-foreground"><Sparkles className="h-5 w-5" /></div>
        <div className="flex-1"><p className="text-sm font-semibold">{locale === "zh-TW" ? "看看 AI 的本月觀察" : "See this month's AI insight"}</p><p className="mt-0.5 text-xs text-muted-foreground">{locale === "zh-TW" ? "需要時才產生，避免重複使用額度" : "Generated only when you ask"}</p></div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
    </div>
  )
}
