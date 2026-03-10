"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { type Locale, translations, type TranslationKeys } from "./i18n"

type LocaleContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  currency: string
  setCurrency: (currency: string) => void
  t: TranslationKeys
}

const LocaleContext = createContext<LocaleContextType | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh-TW")
  const [currency, setCurrencyState] = useState<string>("JPY")

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null
    if (saved && (saved === "zh-TW" || saved === "en")) {
      setLocaleState(saved)
    }
    const savedCurrency = localStorage.getItem("currency")
    if (savedCurrency) {
      setCurrencyState(savedCurrency)
    }
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem("locale", newLocale)
  }, [])

  const setCurrency = useCallback((newCurrency: string) => {
    setCurrencyState(newCurrency)
    localStorage.setItem("currency", newCurrency)
  }, [])

  return (
    <LocaleContext.Provider value={{ locale, setLocale, currency, setCurrency, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) throw new Error("useLocale must be used within LocaleProvider")
  return context
}
