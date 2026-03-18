"use server"

import { GoogleGenAI, Type } from "@google/genai"


// Max Vercel Serverless Function duration (if deploying to Vercel Pro, else it's 10-15s for Hobby)
// Server actions respect the page's maxDuration if exported from a page, but here we just export the generic action.

export async function analyzeReceiptAction(base64Data: string, mimeType: string, locale: string = "zh-TW") {
  try {
    // We bypass strict Supabase auth here because the app often uses a hardcoded OWNER_ID
    // If you need auth in the future, just uncomment this:
    // const supabase = await createClient()
    // const { data: { user }, error: authError } = await supabase.auth.getUser()
    // if (authError || !user) throw new Error("Unauthorized")

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server.")
    }

    const ai = new GoogleGenAI({ apiKey })

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
                mimeType: mimeType
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
    console.log("Server Action Gemini Output:", text)

    let result
    try {
      const cleanedText = text.replace(/```(json)?|```/gi, "").trim()
      result = JSON.parse(cleanedText)
    } catch {
      console.warn("Failed to parse JSON, returning raw format")
      result = { raw: text }
    }

    return { success: true, data: result }
  } catch (err: any) {
    console.error("Action error:", err)
    return { success: false, error: err.message || "Failed to analyze receipt" }
  }
}
