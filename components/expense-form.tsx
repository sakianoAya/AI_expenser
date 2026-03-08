"use client"

import { useState, useRef } from "react"
import { useLocale } from "@/lib/locale-context"
import { createClient } from "@/lib/supabase/client"
import { getCategoryIcon } from "@/lib/category-icons"
import { OWNER_ID } from "@/lib/constants"
import { ArrowLeft, Camera, Upload, X, Trash2, ImageIcon, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Category = {
  id: string
  name_zh: string
  name_en: string
  icon: string
  color: string
  group_name: string
  sort_order: number
}

type Expense = {
  id: string
  amount: number
  description: string | null
  receipt_url: string | null
  expense_date: string
  category_id: string | null
}

type Props = {
  expense: Expense | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

export function ExpenseForm({ expense, categories, onClose, onSaved }: Props) {
  const { t, locale } = useLocale()
  const isEditing = !!expense
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [amount, setAmount] = useState(expense ? String(expense.amount) : "")
  const [categoryId, setCategoryId] = useState(expense?.category_id || "")
  const [description, setDescription] = useState(expense?.description || "")
  const [date, setDate] = useState(expense?.expense_date || new Date().toISOString().split("T")[0])
  const [receiptUrl, setReceiptUrl] = useState(expense?.receipt_url || "")
  const [uploading, setUploading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const groupedCategories = categories.reduce<Record<string, Category[]>>((acc, cat) => {
    if (!acc[cat.group_name]) acc[cat.group_name] = []
    acc[cat.group_name].push(cat)
    return acc
  }, {})

  const groupLabels: Record<string, string> = {
    living: locale === "zh-TW" ? "基本生活" : "Living",
    entertainment: locale === "zh-TW" ? "娛樂休閒" : "Entertainment",
    fixed: locale === "zh-TW" ? "固定支出" : "Fixed",
  }

  async function handleImageUpload(file: File) {
    if (!file) return
    
    // We run the file upload to our storage and the AI scan concurrently
    setUploading(true)
    setScanning(true)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("receipt", file)
    formData.append("locale", locale)

    try {
      // 1. Upload to Blob storage
      const uploadPromise = fetch("/api/upload", { method: "POST", body: formData })
        .then(res => res.json())
        .then(data => {
          if (data.url) setReceiptUrl(data.url)
        })

      // 2. Scan with Gemini
      const scanPromise = fetch("/api/ai/receipt", { method: "POST", body: formData })
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            const aiData = data.data
            if (aiData.amount && !amount) setAmount(String(aiData.amount))
            if (aiData.date && !date) setDate(aiData.date)
            if (aiData.description && !description) setDescription(aiData.description)
          }
        })

      await Promise.allSettled([uploadPromise, scanPromise])
    } catch (err) {
      console.error("Upload/Scan failed:", err)
    } finally {
      setUploading(false)
      setScanning(false)
    }
  }

  async function handleSave() {
    if (!amount || !categoryId) return
    setSaving(true)
    try {
      const supabase = createClient()

      const payload = {
        user_id: OWNER_ID,
        amount: parseFloat(amount),
        category_id: categoryId,
        description: description || null,
        receipt_url: receiptUrl || null,
        expense_date: date,
      }

      if (isEditing) {
        await supabase.from("expenses").update(payload).eq("id", expense.id)
      } else {
        await supabase.from("expenses").insert(payload)
      }

      onSaved()
    } catch (err) {
      console.error("Save failed:", err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!expense) return
    setSaving(true)
    try {
      const supabase = createClient()
      await supabase.from("expenses").delete().eq("id", expense.id)
      onSaved()
    } catch (err) {
      console.error("Delete failed:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-5 pt-safe-top pb-32 animate-in slide-in-from-bottom-5 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-all active:scale-90"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
          {isEditing ? t.expenses.edit : t.expenses.add}
        </h1>
        {isEditing && (
          <button
            onClick={() => setShowDelete(true)}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-all active:scale-90"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Amount Input */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-muted-foreground">{t.expenses.amount}</label>
        <div className="flex items-center gap-3 rounded-[1.5rem] bg-secondary border-2 border-transparent focus-within:border-primary focus-within:bg-card px-5 transition-all shadow-sm">
          <span className="text-2xl font-extrabold text-muted-foreground">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="h-16 flex-1 bg-transparent text-4xl font-extrabold text-foreground outline-none placeholder:text-muted-foreground/30 font-mono tracking-tighter"
            autoFocus
          />
          <span className="text-sm font-bold text-muted-foreground">TWD</span>
        </div>
      </div>

      {/* Category Selection */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-bold text-muted-foreground">{t.expenses.category}</label>
        {Object.entries(groupedCategories).map(([group, cats]) => (
          <div key={group} className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 ml-1">{groupLabels[group] || group}</span>
            <div className="flex flex-wrap gap-2.5">
              {cats.map((cat) => {
                const Icon = getCategoryIcon(cat.icon)
                const isSelected = categoryId === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-[1.25rem] px-4 py-2.5 text-sm font-bold transition-all active:scale-95 border-2",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                        : "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    <Icon className="h-4 w-4" style={{ color: isSelected ? "currentColor" : cat.color }} />
                    {locale === "zh-TW" ? cat.name_zh : cat.name_en}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Date */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-muted-foreground">{t.expenses.date}</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-14 rounded-2xl bg-secondary border-2 border-transparent focus:border-primary focus:bg-card px-5 text-foreground text-base font-medium transition-all outline-none"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-muted-foreground">{t.expenses.description}</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={locale === "zh-TW" ? "備註（選填）" : "Note (optional)"}
          className="h-14 rounded-2xl bg-secondary border-2 border-transparent focus:border-primary focus:bg-card px-5 text-foreground text-base font-medium placeholder:text-muted-foreground/50 transition-all outline-none"
        />
      </div>

      {/* Receipt Upload */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-muted-foreground">{t.expenses.receipt}</label>
        {receiptUrl ? (
          <div className="relative overflow-hidden rounded-2xl border-2 border-border/50 shadow-sm">
            <img src={receiptUrl} alt="Receipt" className="h-48 w-full object-cover" />
            <button
              onClick={() => setReceiptUrl("")}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur text-foreground shadow-sm transition-transform active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || scanning}
              className="relative flex flex-1 items-center justify-center gap-3 overflow-hidden rounded-2xl bg-secondary border-2 border-transparent hover:border-border py-4 text-[15px] font-bold text-secondary-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-80"
            >
              {(uploading || scanning) ? (
                <>
                  <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-primary font-semibold">
                    {locale === "zh-TW" ? "AI 收據解析中..." : "AI Scanning..."}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>{locale === "zh-TW" ? "AI 智能掃描收據" : "AI Receipt Scan"}</span>
                </>
              )}
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImageUpload(file)
          }}
        />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || !amount || !categoryId}
        className="fixed bottom-6 left-4 right-4 flex h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-lg shadow-lg shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 z-10"
      >
        {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : t.expenses.save}
      </button>

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 flex flex-col gap-4 border border-border">
            <p className="text-center text-sm text-foreground">{t.expenses.confirmDelete}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 h-11 rounded-xl bg-secondary text-secondary-foreground font-medium"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 h-11 rounded-xl bg-destructive text-white font-medium"
              >
                {saving ? t.common.loading : t.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
