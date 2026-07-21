"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useLocale } from "@/lib/locale-context"
import { formatCurrency, formatDate } from "@/lib/format"
import { getCategoryIcon } from "@/lib/category-icons"
import { getCategoryLabel } from "@/lib/category-taxonomy"
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

async function fetchExpenses(monthKey: string): Promise<Expense[]> {
  const response = await fetch(`/api/v2/expenses?month=${monthKey}`)
  if (!response.ok) throw new Error("Unable to load expenses")
  const payload = await response.json()
  return (payload.expenses || []).map((expense: Record<string, unknown>) => ({ ...expense, category_id: expense.category_key, categories: expense.categories_v2 })) as Expense[]
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
  const response = await fetch("/api/v2/expenses")
  if (!response.ok) return DEFAULT_CATEGORIES
  const payload = await response.json()
  return (payload.categories || []).map((category: Record<string, unknown>) => ({ ...category, id: category.key, group_name: category.group_key }))
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
    <div className="flex flex-col gap-5 px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{locale === "zh-TW" ? "明細" : "Transactions"}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{t.expenses.title}</h1>
      </div>
      {/* Month Selector */}
      <div className="surface-card flex items-center justify-between rounded-2xl p-2">
        <button onClick={prevMonth} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center px-3">
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
                          {getCategoryLabel(cat, locale)}
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

      <button
        onClick={() => { setEditingExpense(null); setShowForm(true) }}
        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/35 bg-primary/5 text-sm font-semibold text-primary"
        aria-label={t.expenses.add}
      >
        <Plus className="h-4 w-4" />{t.expenses.add}
      </button>
    </div>
  )
}
