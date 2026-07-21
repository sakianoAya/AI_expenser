"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, Lightbulb, Loader2, Send, Sparkles, User } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import { cn } from "@/lib/utils"

type Message = { role: "user" | "assistant"; content: string }

export function AdvisorView() {
  const { t, locale } = useLocale()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  async function handleSend(text?: string) {
    const message = text || input.trim()
    if (!message || loading) return
    setInput("")
    const nextMessages: Message[] = [...messages, { role: "user", content: message }]
    const assistantIndex = nextMessages.length
    setMessages([...nextMessages, { role: "assistant", content: "" }])
    setLoading(true)
    try {
      const response = await fetch("/api/ai/advice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: nextMessages, locale }) })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || response.statusText)
      }
      if (!response.body) throw new Error("No response body")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ""
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        fullContent += decoder.decode(value, { stream: true })
        setMessages((current) => {
          const updated = [...current]
          updated[assistantIndex] = { role: "assistant", content: fullContent }
          return updated
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      setMessages((current) => {
        const updated = [...current]
        updated[assistantIndex] = { role: "assistant", content: `${t.advisor.error}${message ? `\n\n${message}` : ""}` }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-5.75rem)] flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8">
      <header className="pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{locale === "zh-TW" ? "按需產生" : "On demand"}</p>
        <div className="mt-1 flex items-end justify-between gap-4"><div><h1 className="text-2xl font-bold tracking-tight">{t.advisor.title}</h1><p className="mt-1 text-sm text-muted-foreground">{locale === "zh-TW" ? "根據你的記帳資料提供簡短、可行動的建議" : "Short, actionable advice based on your records"}</p></div><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/15"><Sparkles className="h-5 w-5" /></div></div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-4">
        {messages.length === 0 ? <div className="space-y-5">
          <div className="rounded-[1.5rem] bg-primary p-5 text-primary-foreground"><Lightbulb className="h-5 w-5 opacity-80" /><p className="mt-5 text-lg font-bold">{locale === "zh-TW" ? "先問一個具體問題" : "Start with one focused question"}</p><p className="mt-2 text-sm leading-relaxed text-primary-foreground/75">{locale === "zh-TW" ? "AI 只會在你按下問題後使用額度，回答會以目前的消費紀錄為依據。" : "AI usage starts only after you ask and uses your current expense records."}</p></div>
          <div className="space-y-2">{t.advisor.suggestions.map((suggestion) => <button key={suggestion} onClick={() => handleSend(suggestion)} className="surface-card flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-sm font-medium"><span>{suggestion}</span><Send className="h-4 w-4 shrink-0 text-primary" /></button>)}</div>
        </div> : <div className="space-y-4">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}><div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", message.role === "user" ? "bg-secondary" : "bg-primary text-primary-foreground")}>{message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</div><div className={cn("max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6", message.role === "user" ? "bg-primary text-primary-foreground" : "surface-card")}>{message.content || (loading && index === messages.length - 1 ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t.advisor.thinking}</span> : "")}</div></div>)}</div>}
      </div>

      <div className="pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"><div className="surface-card flex items-center gap-2 rounded-2xl p-2"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") handleSend() }} placeholder={t.advisor.askQuestion} className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground/60" /><button onClick={() => handleSend()} disabled={!input.trim() || loading} className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-35"><Send className="h-5 w-5" /></button></div></div>
    </div>
  )
}
