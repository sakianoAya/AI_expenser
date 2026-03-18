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
      ? "請從這張實體收據（多為日文）中擷取資訊，並以指定的 JSON 格式回傳。1. 金額(amount)保留純數字(如268) 2. 日期(date)格式為YYYY-MM-DD 3. 店家名稱(storeName)請保留原文 4. 把所有購買品項(items)獨立出來(含名稱與價格) 5. 若有優惠券或折扣(coupon)請擷取，無則留空。不要回傳 markdown 代碼區塊，直接回傳 JSON。"
      : "Please extract info from this Japanese receipt into JSON. 1. Amount is number. 2. Date is YYYY-MM-DD. 3. storeName keeps original text. 4. items array contains name and price. 5. coupon if any. DO NOT wrap output in markdown, just raw JSON."

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
            storeName: { type: Type.STRING, description: "The name of the store or location." },
            coupon: { type: Type.STRING, description: "Any coupon, point, or discount info if present." },
            items: { 
              type: Type.ARRAY, 
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER }
                }
              }
            }
          },
          required: ["amount", "date"]
        }
      }
    })

    const text = response.text || "{}"
    console.log("Server Action Gemini Output:", text)

    let result: any = {}
    try {
      const cleanedText = text.replace(/```(json)?|```/gi, "").trim()
      result = JSON.parse(cleanedText)
      
      // Post-process the description from the structured data
      if (!result.raw) {
        let finalDescription = ""
        
        // Location
        if (result.storeName) {
          finalDescription += `📍 ${locale === "zh-TW" ? "地點" : "Location"}：${result.storeName}\n`
        }
        
        // Items
        if (result.items && Array.isArray(result.items) && result.items.length > 0) {
          finalDescription += `📝 ${locale === "zh-TW" ? "明細" : "Items"}：\n`
          result.items.forEach((item: any) => {
            const priceStr = item.price ? ` $${item.price}` : ""
            finalDescription += `- ${item.name}${priceStr}\n`
          })
        }
        
        // Coupon
        if (result.coupon) {
          finalDescription += `🎟️ ${locale === "zh-TW" ? "優惠" : "Coupon"}：${result.coupon}\n`
        }

        // Set it back to description property that the client expects
        result.description = finalDescription.trim()
        
        // Remove massive arrays from payload if needed, though they are fine
      }
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
