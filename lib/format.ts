import type { Locale } from "./i18n"

export function formatCurrency(amount: number, currency = "JPY", locale: Locale = "zh-TW"): string {
  return new Intl.NumberFormat(locale === "zh-TW" ? "zh-TW" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date, locale: Locale = "zh-TW"): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(d)
}

export function formatDateFull(date: string | Date, locale: Locale = "zh-TW"): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d)
}

export function formatTime(date: string | Date, locale: Locale = "zh-TW"): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function getMonthRange(date: Date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  }
}

export function getToday(): string {
  return new Date().toISOString().split("T")[0]
}
