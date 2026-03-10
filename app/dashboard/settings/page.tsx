"use client"

import { useState, useEffect } from "react"
import { useLocale } from "@/lib/locale-context"
import { Bell, Clock, MessageSquare, ChevronLeft, Loader2, Globe, DollarSign } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { OWNER_ID } from "@/lib/constants"

export default function SettingsPage() {
  const { t, locale, setLocale, currency, setCurrency } = useLocale()
  const router = useRouter()
  
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  
  const [time, setTime] = useState("20:00")
  const [message, setMessage] = useState(
    locale === "zh-TW" ? "記得記錄今天的花費喔！" : "Remember to log your expenses today!"
  )

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true)
      checkSubscription()
    } else {
      setLoading(false)
    }
  }, [])

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (err) {
      console.error("Error checking subscription:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleTogglePush(enabled: boolean) {
    if (!enabled) {
      // Unsubscribe logic (For simplicity we just alert here, but ideally you call unregister)
      alert(locale === "zh-TW" ? "關閉通知功能目前需到系統設定中更改" : "Disable notifications in System Settings")
      return
    }

    setSaving(true)
    try {
      const registration = await navigator.serviceWorker.ready
      
      // Request permission
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        throw new Error("Permission not granted")
      }

      // TODO: Replace with your actual VAPID public key
      const applicationServerKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!applicationServerKey) {
        alert(locale === "zh-TW" ? "系統尚未配置推播金鑰" : "VAPID key not configured.")
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      })

      // Send to backend
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          notificationTime: time,
          notificationMessage: message
        })
      })

      if (!res.ok) throw new Error("Failed to save subscription on server")

      setIsSubscribed(true)
      alert(locale === "zh-TW" ? "推播通知已啟用！" : "Push notifications enabled!")
    } catch (err) {
      console.error("Push registration failed", err)
      alert(locale === "zh-TW" ? "無法啟用推播通知" : "Failed to enable notifications")
    } finally {
      setSaving(false)
    }
  }

  async function handleLanguageChange(newLocale: "zh-TW" | "en") {
    setLocale(newLocale)
    try {
      const supabase = createClient()
      await supabase.from("profiles").update({ preferred_locale: newLocale }).eq("id", OWNER_ID)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleCurrencyChange(newCurrency: string) {
    setCurrency(newCurrency)
    setSavingProfile(true)
    try {
      const supabase = createClient()
      await supabase.from("profiles").update({ preferred_currency: newCurrency }).eq("id", OWNER_ID)
    } catch (e) {
      console.error(e)
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {locale === "zh-TW" ? "設定" : "Settings"}
            </h1>
          </div>
        </div>
      </header>

      <main className="flex flex-col gap-6 p-4">
        {/* Preferences Section */}
        <section className="flex flex-col gap-4 rounded-3xl bg-card border border-border p-5">
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-foreground">
              {locale === "zh-TW" ? "個人偏好" : "Preferences"}
            </h2>
            
            {/* Language */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                  <Globe className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-foreground">{t.settings.language}</span>
              </div>
              <select
                value={locale}
                onChange={(e) => handleLanguageChange(e.target.value as "zh-TW" | "en")}
                className="h-10 rounded-xl bg-secondary px-3 text-sm font-medium text-foreground outline-none border-0 ring-0 focus:ring-2 focus:ring-primary/50"
              >
                <option value="zh-TW">繁體中文</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Currency */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                  <DollarSign className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-foreground">{t.settings.currency}</span>
              </div>
              <div className="flex items-center gap-2">
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <select
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="h-10 rounded-xl bg-secondary px-3 text-sm font-medium text-foreground outline-none border-0 ring-0 focus:ring-2 focus:ring-primary/50"
                >
                  <option value="JPY">JPY</option>
                  <option value="TWD">TWD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Push Notification Section */}
        <section className="flex flex-col gap-4 rounded-3xl bg-card border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-foreground">
                {locale === "zh-TW" ? "每日提醒通知" : "Daily Reminders"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {locale === "zh-TW" ? "設定 PWA 背景推播" : "Configure PWA push notifications"}
              </p>
            </div>
            {isSupported && !loading && (
              <label className="relative inline-flex cursor-pointer items-center">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  checked={isSubscribed}
                  onChange={(e) => handleTogglePush(e.target.checked)}
                  disabled={saving}
                />
                <div className="peer h-6 w-11 rounded-full bg-secondary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-border dark:bg-muted dark:peer-focus:ring-primary"></div>
              </label>
            )}
          </div>

          {!isSupported && !loading && (
            <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {locale === "zh-TW" ? "您的裝置/瀏覽器不支援 Web Push。請將此網站加入 iOS 主畫面後重試。" : "Your device/browser does not support Web Push. Please Add to Home Screen on iOS."}
            </div>
          )}

          {isSupported && (
            <div className="flex flex-col gap-4 pt-4 border-t border-border">
              {/* Time */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {locale === "zh-TW" ? "通知時間" : "Notification Time"}
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={saving}
                  className="h-12 rounded-xl bg-secondary px-4 text-foreground outline-none"
                />
              </div>

              {/* Message */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  {locale === "zh-TW" ? "通知內容" : "Notification Message"}
                </label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={saving}
                  placeholder={locale === "zh-TW" ? "輸入提醒文字..." : "Enter reminder text..."}
                  className="h-12 rounded-xl bg-secondary px-4 text-foreground outline-none"
                />
              </div>

              <button
                onClick={() => handleTogglePush(true)}
                disabled={saving || !isSubscribed}
                className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {locale === "zh-TW" ? "儲存設定" : "Save Settings"}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
