"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useLocale } from "@/lib/locale-context"
import { formatCurrency, formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { getCategoryIcon } from "@/lib/category-icons"
import { OWNER_ID } from "@/lib/constants"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import useSWR, { mutate } from "swr"
import { ExpenseForm } from "./expense-form"

type Expense = {
  id: string
  amount: number
  description: string | null
  receipt_url: string | null
  expense_date: string
  category_id: string | null
  categories: { name_zh: string; name_en: string; icon: string; color: string } | null
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

async function fetchExpenses(monthKey: string) {
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
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })

  return data || []
}

const DEFAULT_CATEGORIES = [
  { id: "c1", name_zh: "飲食", name_en: "Food", icon: "utensils", color: "#F59E0B", group_name: "living", sort_order: 1 },
  { id: "c2", name_zh: "交通", name_en: "Transport", icon: "car", color: "#3B82F6", group_name: "living", sort_order: 2 },
  { id: "c3", name_zh: "日用品", name_en: "Daily", icon: "shopping-bag", color: "#10B981", group_name: "living", sort_order: 3 },
  { id: "c4", name_zh: "娛樂", name_en: "Entertainment", icon: "gamepad-2", color: "#8B5CF6", group_name: "entertainment", sort_order: 4 },
  { id: "c5", name_zh: "購物", name_en: "Shopping", icon: "shopping-cart", color: "#EC4899", group_name: "entertainment", sort_order: 5 },
  { id: "c6", name_zh: "居住", name_en: "Housing", icon: "home", color: "#6B7280", group_name: "fixed", sort_order: 6 },
]

async function fetchCategories() {
  const supabase = createClient()
  const { data } = await supabase.from("categories").select("*").eq("user_id", OWNER_ID).order("sort_order")
  return data && data.length > 0 ? data : DEFAULT_CATEGORIES
}

export function ExpensesView() {
  const { t, locale, currency } = useLocale()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const monthKey = getMonthKey(currentMonth)
  const { data: expenses, isLoading } = useSWR(`expenses-${monthKey}`, () => fetchExpenses(monthKey))
  const { data: categories } = useSWR("categories", fetchCategories)

  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setShowForm(true)
      setEditingExpense(null)
    }
    const editId = searchParams.get("edit")
    if (editId && expenses) {
      const expense = expenses.find((e) => e.id === editId)
      if (expense) {
        setEditingExpense(expense)
        setShowForm(true)
      }
    }
  }, [searchParams, expenses])

  function prevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  function handleClose() {
    setShowForm(false)
    setEditingExpense(null)
    router.replace("/dashboard/expenses")
  }

  async function handleSaved() {
    handleClose()
    mutate(`expenses-${monthKey}`)
    mutate("dashboard-data")
  }

  const monthTotal = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
  const monthLabel = new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-US", {
    year: "numeric",
    month: "long",
  }).format(currentMonth)

  // Group expenses by date
  const grouped = (expenses || []).reduce<Record<string, Expense[]>>((acc, expense) => {
    const date = expense.expense_date
    if (!acc[date]) acc[date] = []
    acc[date].push(expense)
    return acc
  }, {})

  if (showForm) {
    return (
      <ExpenseForm
        expense={editingExpense}
        categories={categories || []}
        onClose={handleClose}
        onSaved={handleSaved}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-base font-semibold text-foreground">{monthLabel}</span>
          <span className="text-xs text-muted-foreground">
            {t.analytics.total}: {formatCurrency(monthTotal, currency, locale)}
          </span>
        </div>
        <button onClick={nextMonth} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Expenses List */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <p className="text-sm text-muted-foreground">{t.expenses.noExpenses}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([date, items]) => {
            const dayTotal = items.reduce((sum, e) => sum + Number(e.amount), 0)
            return (
              <div key={date} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-medium text-muted-foreground">{formatDate(date, locale)}</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    -{formatCurrency(dayTotal, currency, locale)}
                  </span>
                </div>
                {items.map((expense) => {
                  const cat = expense.categories
                  const Icon = getCategoryIcon(cat?.icon || "")
                  return (
                    <button
                      key={expense.id}
                      onClick={() => {
                        setEditingExpense(expense)
                        setShowForm(true)
                      }}
                      className="flex items-center gap-3 rounded-xl bg-card p-3 border border-border text-left transition-colors active:bg-secondary"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: cat?.color ? `${cat.color}20` : "var(--secondary)" }}
                      >
                        <Icon className="h-5 w-5" style={{ color: cat?.color || "var(--foreground)" }} />
                      </div>
                      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                        <span className="text-sm font-medium text-foreground">
                          {locale === "zh-TW" ? cat?.name_zh : cat?.name_en || ""}
                        </span>
                        {expense.description && (
                          <span className="truncate text-xs text-muted-foreground">{expense.description}</span>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-foreground">
                        -{formatCurrency(Number(expense.amount), currency, locale)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { setEditingExpense(null); setShowForm(true) }}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
        aria-label={t.expenses.add}
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  )
}
