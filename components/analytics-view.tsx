"use client"

import { useState } from "react"
import useSWR from "swr"
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChevronLeft, ChevronRight, TrendingUp, WalletCards } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import { formatCurrency } from "@/lib/format"
import { getCategoryIcon } from "@/lib/category-icons"
import { getCategoryLabel } from "@/lib/category-taxonomy"

type AnalyticsExpense = { id: string; amount: number; expense_date: string; category_id: string | null; categories: { name_zh: string; name_en: string; icon: string; color: string } | null }

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

async function fetchAnalytics(monthKey: string): Promise<AnalyticsExpense[]> {
  const response = await fetch(`/api/v2/expenses?month=${monthKey}`)
  if (!response.ok) throw new Error("Unable to load analytics")
  const payload = await response.json()
  return (payload.expenses || []).map((expense: Record<string, unknown>) => ({ ...expense, category_id: expense.category_key, categories: expense.categories_v2 })) as AnalyticsExpense[]
}

export function AnalyticsView() {
  const { t, locale, currency } = useLocale()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [view, setView] = useState<"category" | "date">("category")
  const monthKey = getMonthKey(currentMonth)
  const { data: expenses, isLoading } = useSWR(`analytics-${monthKey}`, () => fetchAnalytics(monthKey))
  const monthLabel = new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-US", { year: "numeric", month: "long" }).format(currentMonth)
  const total = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const isCurrentMonth = currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()
  const daysPassed = isCurrentMonth ? new Date().getDate() : daysInMonth
  const dailyAverage = daysPassed ? total / daysPassed : 0

  const categoryMap = new Map<string, { name: string; color: string; icon: string; total: number }>()
  expenses?.forEach((expense) => {
    const key = expense.category_id || "uncategorized"
    const current = categoryMap.get(key)
    if (current) current.total += Number(expense.amount)
    else categoryMap.set(key, {
      name: getCategoryLabel(expense.categories, locale),
      color: expense.categories?.color || "#94a3b8",
      icon: expense.categories?.icon || "",
      total: Number(expense.amount),
    })
  })
  const categoryData = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total)
  const dailyMap = new Map<number, number>()
  expenses?.forEach((expense) => {
    const day = new Date(expense.expense_date).getDate()
    dailyMap.set(day, (dailyMap.get(day) || 0) + Number(expense.amount))
  })
  const dailyData = Array.from({ length: daysInMonth }, (_, index) => ({ day: index + 1, amount: dailyMap.get(index + 1) || 0 }))
  const largestCategory = categoryData[0]

  return (
    <div className="flex flex-col gap-6 px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{locale === "zh-TW" ? "趨勢" : "Insights"}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{t.analytics.title}</h1>
      </header>

      <div className="surface-card flex items-center justify-between rounded-2xl p-2">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary"><ChevronLeft className="h-5 w-5" /></button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary"><ChevronRight className="h-5 w-5" /></button>
      </div>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
          <WalletCards className="h-5 w-5 opacity-80" />
          <p className="mt-5 text-xs font-medium opacity-70">{t.analytics.total}</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{isLoading ? "—" : formatCurrency(total, currency, locale)}</p>
        </div>
        <div className="surface-card rounded-2xl p-4">
          <TrendingUp className="h-5 w-5 text-accent" />
          <p className="mt-5 text-xs font-medium text-muted-foreground">{locale === "zh-TW" ? "每日平均" : "Daily average"}</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{isLoading ? "—" : formatCurrency(dailyAverage, currency, locale)}</p>
        </div>
      </section>

      {largestCategory && <div className="rounded-2xl bg-accent/10 px-4 py-3 text-sm"><span className="text-muted-foreground">{locale === "zh-TW" ? "本月最大支出是" : "Top category is"}</span><strong className="ml-1.5">{largestCategory.name} · {Math.round((largestCategory.total / total) * 100)}%</strong></div>}

      <div className="flex rounded-2xl bg-secondary p-1">
        <button onClick={() => setView("category")} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${view === "category" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{t.analytics.byCategory}</button>
        <button onClick={() => setView("date")} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${view === "date" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{t.analytics.byDate}</button>
      </div>

      {isLoading ? <div className="h-72 animate-pulse rounded-2xl bg-secondary" /> : view === "category" ? (
        <section className="space-y-4">
          {categoryData.length > 0 && <div className="surface-card relative rounded-[1.4rem] p-4">
            <ResponsiveContainer width="100%" height={210}><PieChart><Pie data={categoryData} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={84} strokeWidth={3} stroke="var(--card)">{categoryData.map((category) => <Cell key={category.name} fill={category.color} />)}</Pie><Tooltip formatter={(value: number) => formatCurrency(value, currency, locale)} contentStyle={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--card)" }} /></PieChart></ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-xs text-muted-foreground">{locale === "zh-TW" ? "分類數" : "Categories"}</span><strong className="text-2xl">{categoryData.length}</strong></div>
          </div>}
          <div className="surface-card overflow-hidden rounded-[1.4rem]">
            {categoryData.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">{t.common.noData}</p> : categoryData.map((category, index) => {
              const Icon = getCategoryIcon(category.icon)
              const percentage = total ? (category.total / total) * 100 : 0
              return <div key={category.name} className={`flex items-center gap-3 px-4 py-3.5 ${index ? "border-t border-border/70" : ""}`}><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${category.color}18` }}><Icon className="h-5 w-5" style={{ color: category.color }} /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><span className="text-sm font-semibold">{category.name}</span><span className="text-sm font-bold">{formatCurrency(category.total, currency, locale)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: category.color }} /></div></div><span className="w-10 text-right text-xs text-muted-foreground">{percentage.toFixed(0)}%</span></div>
            })}
          </div>
        </section>
      ) : <div className="surface-card rounded-[1.4rem] p-4"><ResponsiveContainer width="100%" height={260}><BarChart data={dailyData}><XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={4} /><YAxis hide /><Tooltip formatter={(value: number) => formatCurrency(value, currency, locale)} contentStyle={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--card)" }} /><Bar dataKey="amount" radius={[5, 5, 0, 0]} fill="var(--primary)" /></BarChart></ResponsiveContainer></div>}
    </div>
  )
}
