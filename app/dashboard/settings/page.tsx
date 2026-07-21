"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Bell, CalendarClock, ChevronRight, Clock, DollarSign, Globe, Loader2, MessageSquare, Sparkles } from "lucide-react"
import { useLocale } from "@/lib/locale-context"

export default function SettingsPage() {
  const { t, locale, setLocale, currency, setCurrency } = useLocale()
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [time, setTime] = useState("20:00")
  const [message, setMessage] = useState(locale === "zh-TW" ? "記得記錄今天的花費喔！" : "Remember to log your expenses today!")

  useEffect(() => {
    async function checkSubscription() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setLoading(false)
        return
      }
      setIsSupported(true)
      try {
        const registration = await navigator.serviceWorker.ready
        setIsSubscribed(!!(await registration.pushManager.getSubscription()))
      } catch (error) {
        console.error("Error checking subscription:", error)
      } finally {
        setLoading(false)
      }
    }
    void checkSubscription()
  }, [])

  async function handleTogglePush(enabled: boolean) {
    if (!enabled) {
      alert(locale === "zh-TW" ? "請到裝置的系統設定關閉通知。" : "Disable notifications in system settings.")
      return
    }
    setSaving(true)
    try {
      const registration = await navigator.serviceWorker.ready
      if (await Notification.requestPermission() !== "granted") throw new Error("Permission not granted")
      const applicationServerKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!applicationServerKey) throw new Error(locale === "zh-TW" ? "尚未設定推播金鑰" : "VAPID key is not configured")
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
      const response = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription, notificationTime: time, notificationMessage: message }) })
      if (!response.ok) throw new Error("Failed to save subscription")
      setIsSubscribed(true)
    } catch (error) {
      alert(error instanceof Error ? error.message : (locale === "zh-TW" ? "無法啟用通知" : "Unable to enable notifications"))
    } finally {
      setSaving(false)
    }
  }

  async function handleLanguageChange(nextLocale: "zh-TW" | "en") {
    setLocale(nextLocale)
    const response = await fetch("/api/v2/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferred_locale: nextLocale }) })
    if (!response.ok) console.error("Failed to save locale")
  }

  async function handleCurrencyChange(nextCurrency: string) {
    setCurrency(nextCurrency)
    setSavingProfile(true)
    try {
      const response = await fetch("/api/v2/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferred_currency: nextCurrency }) })
      if (!response.ok) throw new Error("Failed to save currency")
    } finally {
      setSavingProfile(false)
    }
  }

  return <div className="flex flex-col gap-7 px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8">
    <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{locale === "zh-TW" ? "個人偏好" : "Preferences"}</p><h1 className="mt-1 text-2xl font-bold tracking-tight">{t.settings.title}</h1><p className="mt-1 text-sm text-muted-foreground">{locale === "zh-TW" ? "調整顯示、提醒與進階工具" : "Display, reminders and advanced tools"}</p></header>

    <section><h2 className="mb-3 px-1 text-sm font-semibold">{locale === "zh-TW" ? "顯示" : "Display"}</h2><div className="surface-card overflow-hidden rounded-[1.4rem]">
      <SettingRow icon={Globe} title={t.settings.language}><select value={locale} onChange={(event) => handleLanguageChange(event.target.value as "zh-TW" | "en")} className="rounded-xl bg-secondary px-3 py-2 text-sm font-semibold outline-none"><option value="zh-TW">繁體中文</option><option value="en">English</option></select></SettingRow>
      <SettingRow icon={DollarSign} title={t.settings.currency} border>{savingProfile && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}<select value={currency} onChange={(event) => handleCurrencyChange(event.target.value)} className="rounded-xl bg-secondary px-3 py-2 text-sm font-semibold outline-none"><option>JPY</option><option>TWD</option><option>USD</option><option>EUR</option></select></SettingRow>
    </div></section>

    <section><h2 className="mb-3 px-1 text-sm font-semibold">{locale === "zh-TW" ? "每日記帳提醒" : "Daily reminder"}</h2><div className="surface-card rounded-[1.4rem] p-4">
      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bell className="h-5 w-5" /></div><div className="flex-1"><p className="text-sm font-semibold">{locale === "zh-TW" ? "推播通知" : "Push notification"}</p><p className="mt-0.5 text-xs text-muted-foreground">{loading ? t.common.loading : isSupported ? (isSubscribed ? (locale === "zh-TW" ? "已啟用" : "Enabled") : (locale === "zh-TW" ? "尚未啟用" : "Not enabled")) : (locale === "zh-TW" ? "此裝置不支援" : "Not supported")}</p></div>{isSupported && !loading && <button onClick={() => handleTogglePush(!isSubscribed)} disabled={saving} className={`relative h-7 w-12 rounded-full transition-colors ${isSubscribed ? "bg-primary" : "bg-secondary"}`}><span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${isSubscribed ? "translate-x-5" : "translate-x-0.5"}`} /></button>}</div>
      {isSupported && <div className="mt-4 grid gap-3 border-t border-border/70 pt-4"><label className="grid gap-2 text-xs font-medium text-muted-foreground"><span className="flex items-center gap-2"><Clock className="h-4 w-4" />{locale === "zh-TW" ? "時間" : "Time"}</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="h-12 rounded-xl bg-secondary px-4 text-base text-foreground outline-none" /></label><label className="grid gap-2 text-xs font-medium text-muted-foreground"><span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />{locale === "zh-TW" ? "內容" : "Message"}</span><input value={message} onChange={(event) => setMessage(event.target.value)} className="h-12 rounded-xl bg-secondary px-4 text-base text-foreground outline-none" /></label>{isSubscribed && <button onClick={() => handleTogglePush(true)} disabled={saving} className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (locale === "zh-TW" ? "儲存提醒" : "Save reminder")}</button>}</div>}
    </div></section>

    <section><h2 className="mb-3 px-1 text-sm font-semibold">{locale === "zh-TW" ? "工具" : "Tools"}</h2><div className="surface-card overflow-hidden rounded-[1.4rem]"><ToolLink href="/dashboard/advisor" icon={Sparkles} title={locale === "zh-TW" ? "AI 財務顧問" : "AI advisor"} subtitle={locale === "zh-TW" ? "按需分析，不會自動消耗額度" : "On-demand, never runs automatically"} /><ToolLink href="/dashboard/schedule" icon={CalendarClock} title={locale === "zh-TW" ? "固定支出與提醒" : "Bills & reminders"} subtitle={locale === "zh-TW" ? "管理付款日期與生活提醒" : "Payment dates and personal reminders"} border /></div></section>
  </div>
}

function SettingRow({ icon: Icon, title, children, border = false }: { icon: typeof Globe; title: string; children: React.ReactNode; border?: boolean }) {
  return <div className={`flex items-center gap-3 px-4 py-3.5 ${border ? "border-t border-border/70" : ""}`}><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary"><Icon className="h-5 w-5" /></div><span className="flex-1 text-sm font-semibold">{title}</span><div className="flex items-center gap-2">{children}</div></div>
}

function ToolLink({ href, icon: Icon, title, subtitle, border = false }: { href: string; icon: typeof Sparkles; title: string; subtitle: string; border?: boolean }) {
  return <Link href={href} className={`flex items-center gap-3 px-4 py-3.5 ${border ? "border-t border-border/70" : ""}`}><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary"><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p></div><ChevronRight className="h-5 w-5 text-muted-foreground" /></Link>
}
