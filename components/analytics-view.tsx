"use client"

import { useState } from "react"
import { useLocale } from "@/lib/locale-context"
import { formatCurrency } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { getCategoryIcon } from "@/lib/category-icons"
import { OWNER_ID } from "@/lib/constants"
import { ChevronLeft, ChevronRight } from "lucide-react"
import useSWR from "swr"
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
  PieChart, Pie,
} from "recharts"

type Expense = {
  id: string
  amount: number
  expense_date: string
  category_id: string | null
  categories: { name_zh: string; name_en: string; icon: string; color: string } | null
}

function getMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

async function fetchAnalytics(monthKey: string) {
  const supabase = createClient()
  const [year, month] = monthKey.split("-").map(Number)
  const start = new Date(year, month - 1, 1).toISOString().split("T")[0]
  const end = new Date(year, month, 0).toISOString().split("T")[0]

  const { data } = await supabase
    .from("expenses")
    .select("*, categories(name_zh, name_en, icon, color)")
    .eq("user_id", OWNER_ID)
    .gte("expense_date", start)
    .lte("expense_date", end)
    .order("expense_date")

  return data || []
}

export function AnalyticsView() {
  const { t, locale, currency } = useLocale()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [view, setView] = useState<"category" | "date">("category")

  const monthKey = getMonthKey(currentMonth)
  const { data: expenses, isLoading } = useSWR(`analytics-${monthKey}`, () => fetchAnalytics(monthKey))

  const monthLabel = new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-US", {
    year: "numeric",
    month: "long",
  }).format(currentMonth)

  const total = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const daysPassed = currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()
    ? new Date().getDate()
    : daysInMonth
  const dailyAvg = daysPassed > 0 ? total / daysPassed : 0

  // Category breakdown
  const categoryMap = new Map<string, { name: string; color: string; icon: string; total: number }>()
  expenses?.forEach((e) => {
    const key = e.category_id || "uncategorized"
    const existing = categoryMap.get(key)
    if (existing) {
      existing.total += Number(e.amount)
    } else {
      categoryMap.set(key, {
        name: locale === "zh-TW" ? (e.categories?.name_zh || "Other") : (e.categories?.name_en || "Other"),
        color: e.categories?.color || "#94a3b8",
        icon: e.categories?.icon || "",
        total: Number(e.amount),
      })
    }
  })
  const categoryData = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total)

  // Daily breakdown
  const dailyMap = new Map<number, number>()
  expenses?.forEach((e) => {
    const day = new Date(e.expense_date).getDate()
    dailyMap.set(day, (dailyMap.get(day) || 0) + Number(e.amount))
  })
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    amount: dailyMap.get(i + 1) || 0,
  }))

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-foreground">{monthLabel}</h1>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-2xl bg-card p-4 border border-border">
          <span className="text-xs text-muted-foreground">{t.analytics.total}</span>
          <span className="text-xl font-bold text-foreground">
            {isLoading ? "..." : formatCurrency(total, currency, locale)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl bg-card p-4 border border-border">
          <span className="text-xs text-muted-foreground">{t.analytics.average}</span>
          <span className="text-xl font-bold text-foreground">
            {isLoading ? "..." : formatCurrency(dailyAvg, currency, locale)}
            <span className="text-xs font-normal text-muted-foreground">/{locale === "zh-TW" ? "天" : "day"}</span>
          </span>
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex rounded-xl bg-secondary p-1">
        <button
          onClick={() => setView("category")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${view === "category" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          {t.analytics.byCategory}
        </button>
        <button
          onClick={() => setView("date")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${view === "date" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          {t.analytics.byDate}
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-secondary" />
      ) : view === "category" ? (
        <div className="flex flex-col gap-4">
          {/* Pie Chart */}
          {categoryData.length > 0 && (
            <div className="flex items-center justify-center rounded-2xl bg-card p-4 border border-border">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    strokeWidth={2}
                    stroke="var(--card)"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value, currency, locale)}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--card)",
                      color: "var(--foreground)",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category List */}
          <div className="flex flex-col gap-2">
            {categoryData.map((cat) => {
              const percent = total > 0 ? (cat.total / total * 100).toFixed(1) : "0"
              const Icon = getCategoryIcon(cat.icon)
              return (
                <div key={cat.name} className="flex items-center gap-3 rounded-xl bg-card p-3 border border-border">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${cat.color}20` }}>
                    <Icon className="h-5 w-5" style={{ color: cat.color }} />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(cat.total, currency, locale)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: cat.color }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{percent}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Daily Bar Chart */
        <div className="rounded-2xl bg-card p-4 border border-border">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis hide />
              <Tooltip
                formatter={(value: number) => formatCurrency(value, currency, locale)}
                labelFormatter={(label) => `${locale === "zh-TW" ? "第" : "Day "}${label}${locale === "zh-TW" ? "天" : ""}`}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--card)",
                  color: "var(--foreground)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
