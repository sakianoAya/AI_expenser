import { GoogleGenAI } from "@google/genai"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse, type NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  const ai = new GoogleGenAI({ apiKey: apiKey || "" })

  try {
    const { messages, locale = "zh-TW" } = await request.json()

    if (!apiKey) {
      return NextResponse.json({
        content: locale === "zh-TW"
          ? "AI 功能尚未設定。請在專案設定中新增 GEMINI_API_KEY 環境變數。"
          : "AI is not configured. Please add the GEMINI_API_KEY environment variable in project settings."
      })
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch expense data for context
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0]

    const [thisMonthRes, lastMonthRes, profileRes] = await Promise.all([
      supabase
        .from("expenses_v2")
        .select("amount, expense_date, categories_v2!expenses_v2_category_key_fkey(name_zh, name_en)")
        .gte("expense_date", monthStart)
        .order("expense_date"),
      supabase
        .from("expenses_v2")
        .select("amount, expense_date, categories_v2!expenses_v2_category_key_fkey(name_zh, name_en)")
        .gte("expense_date", lastMonthStart)
        .lte("expense_date", lastMonthEnd)
        .order("expense_date"),
      supabase.from("app_settings_v2").select("monthly_budget, preferred_currency").eq("singleton_id", 1).maybeSingle(),
    ])

    const thisMonth = thisMonthRes.data || []
    const lastMonth = lastMonthRes.data || []
    const profile = profileRes.data

    const thisMonthTotal = thisMonth.reduce((sum, e) => sum + Number(e.amount), 0)
    const lastMonthTotal = lastMonth.reduce((sum, e) => sum + Number(e.amount), 0)

    const categoryTotals = new Map<string, number>()
    thisMonth.forEach((e) => {
      // Supabase returns an array for one-to-many or a single object for many-to-one
      // Based on the query it could be an array of objects or single object.
      const catData = Array.isArray(e.categories_v2) ? e.categories_v2[0] : e.categories_v2
      const cat = catData as { name_zh: string; name_en: string } | null
      const name = locale === "zh-TW" ? cat?.name_zh : cat?.name_en || "Other"
      categoryTotals.set(name || "Other", (categoryTotals.get(name || "Other") || 0) + Number(e.amount))
    })

    const categoryBreakdown = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => `${name}: $${total.toFixed(0)}`)
      .join(", ")

    const lang = locale === "zh-TW" ? "繁體中文" : "English"
    const systemPrompt = `You are a helpful personal financial advisor AI assistant. You must respond in ${lang}.

User's financial context:
- Monthly budget: $${profile?.monthly_budget || "not set"} ${profile?.preferred_currency || "TWD"}
- This month's total spending: $${thisMonthTotal.toFixed(0)}
- Last month's total spending: $${lastMonthTotal.toFixed(0)}
- This month's category breakdown: ${categoryBreakdown || "No data yet"}
- Number of transactions this month: ${thisMonth.length}

Be helpful, specific, and actionable. If the user asks about their spending, use the data above. Give practical advice. Keep responses concise but informative (under 300 words). Use a friendly conversational tone.`

    // Format messages for Gemini SDK
    // The previous code mapped everything to user/model roles but didn't actually keep a history.
    // Assuming messages is an array of { role: 'user' | 'assistant', content: string }
    const geminiContents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    // Use generateContentStream for streaming responses
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: geminiContents,
      config: {
        systemInstruction: systemPrompt
      }
    })

    // Create a TextEncoder to stream string data to the client
    const encoder = new TextEncoder()
    const readableStream = new ReadableStream({
      async start(controller) {
        let fullResponse = ""
        try {
          for await (const chunk of responseStream) {
            const chunkText = chunk.text
            if (chunkText) {
              fullResponse += chunkText
              // We structure our chunk streaming data (Server-Sent Events style or just raw text depending on client)
              // For simplicity, we just send raw text chunks. 
              controller.enqueue(encoder.encode(chunkText))
            }
          }
          
          // Optionally save to DB after streaming finishes
          // Note: we're only saving the user's last message, and the full response
          const lastUserMsg = messages[messages.length - 1].content
          if (lastUserMsg) {
            // We run this without awaiting so it doesn't block the stream ending
            supabase.from("ai_advice_v2").insert({
              advice_type: "chat",
              prompt: lastUserMsg,
              content: fullResponse,
              context: { thisMonthTotal, lastMonthTotal, categoryBreakdown },
              model: "gemini-2.5-flash",
            }).then(({ error }) => {
              if (error) console.error("Error saving advice to DB:", error)
            })
          }
        } catch (err) {
          console.error("Streaming error:", err)
          controller.error(err)
        } finally {
          controller.close()
        }
      }
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
    
  } catch (error) {
    console.error("AI advice error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
