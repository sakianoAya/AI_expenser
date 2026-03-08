"use client"

import { useState, useRef, useEffect } from "react"
import { useLocale } from "@/lib/locale-context"
import { Sparkles, Send, User, Bot, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = {
  role: "user" | "assistant"
  content: string
}

export function AdvisorView() {
  const { t, locale } = useLocale()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  async function handleSend(text?: string) {
    const message = text || input.trim()
    if (!message || loading) return

    setInput("")
    
    // We add the user message, and a placeholder for the assistant message
    const newMessages: Message[] = [...messages, { role: "user", content: message }]
    const placeholderAssistantMsgIdx = newMessages.length
    const messagesWithPlaceholder: Message[] = [...newMessages, { role: "assistant", content: "" }]
    
    setMessages(messagesWithPlaceholder)
    setLoading(true)

    try {
      const res = await fetch("/api/ai/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the entire history (excluding the empty placeholder)
        body: JSON.stringify({ messages: newMessages, locale }),
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(errorData?.error || res.statusText)
      }

      if (!res.body) throw new Error("No response body")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let fullContent = ""

      while (!done) {
        setLoading(false) // Ready to stream
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          fullContent += decoder.decode(value, { stream: true })
          setMessages((prev) => {
            const updated = [...prev]
            updated[placeholderAssistantMsgIdx] = { role: "assistant", content: fullContent }
            return updated
          })
        }
      }

    } catch (err: any) {
      console.error(err)
      setMessages((prev) => {
        const updated = [...prev]
        updated[placeholderAssistantMsgIdx] = { role: "assistant", content: `${t.advisor.error}\n\n${err.message || ""}` }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-5rem)] flex-col">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">{t.advisor.title}</h1>
            <p className="text-xs text-muted-foreground">{t.advisor.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-4 pt-8">
            <div className="flex flex-col items-center gap-3 pb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {locale === "zh-TW"
                  ? "我可以分析你的消費模式、給你省錢建議、幫你規劃預算。試試問我以下問題："
                  : "I can analyze your spending, give saving tips, and help plan budgets. Try asking:"}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {t.advisor.suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(suggestion)}
                  className="rounded-xl bg-card border border-border p-3 text-left text-sm text-foreground transition-colors active:bg-secondary"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  msg.role === "user" ? "bg-secondary" : "bg-primary"
                )}>
                  {msg.role === "user"
                    ? <User className="h-4 w-4 text-secondary-foreground" />
                    : <Bot className="h-4 w-4 text-primary-foreground" />
                  }
                </div>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                )}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-card border border-border px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.advisor.thinking}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend() }}
            placeholder={t.advisor.askQuestion}
            className="h-11 flex-1 rounded-xl bg-secondary px-4 text-foreground text-base placeholder:text-muted-foreground/50 outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
