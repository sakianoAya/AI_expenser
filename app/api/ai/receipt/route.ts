import { GoogleGenAI, Type } from "@google/genai"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const apiKey = process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey: apiKey || "" })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get("receipt") as File
    const locale = formData.get("locale") as string || "zh-TW"

    if (!file) {
      return NextResponse.json({ error: "No receipt file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Data = buffer.toString("base64")

    const langPrompt = locale === "zh-TW" 
      ? "請從這張收據中擷取資訊，並以指定的 JSON 格式回傳。金額只能是數字。日期格式必須為 YYYY-MM-DD。如果是電子發票或電子支付憑證，也請照樣辨識。不要回傳任何 Markdown 代碼區塊(```json)，直接回傳 JSON 字串。"
      : "Please extract information from this receipt and return it in the specified JSON format. Amount must be a number. Date format must be YYYY-MM-DD. Identify electronic receipts as well. DO NOT wrap the output in markdown code blocks like ```json, just return the raw JSON object string."

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: langPrompt },
            { 
              inlineData: {
                data: base64Data,
                mimeType: file.type
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "The total amount of the transaction." },
            date: { type: Type.STRING, description: "The date of the transaction in YYYY-MM-DD format." },
            description: { type: Type.STRING, description: "The name of the store or main item purchased." }
          },
          required: ["amount", "date", "description"]
        }
      }
    })

    const text = response.text || "{}"
    let result
    try {
      result = JSON.parse(text)
    } catch {
      // In case the model fails to follow strict JSON for some reason
      result = text
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error("Receipt AI parsing error:", error)
    return NextResponse.json({ error: "Failed to parse receipt" }, { status: 500 })
  }
}
