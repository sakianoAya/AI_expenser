import { NextResponse, type NextRequest } from "next/server"
import { ACCESS_COOKIE, accessDigest } from "@/lib/access"

export async function POST(request: NextRequest) {
  const configured = process.env.APP_ACCESS_PASSWORD
  if (!configured) return NextResponse.json({ error: "App access password is not configured" }, { status: 503 })
  const { password } = await request.json().catch(() => ({ password: "" }))
  if (typeof password !== "string" || await accessDigest(password) !== await accessDigest(configured)) {
    return NextResponse.json({ error: "密碼不正確" }, { status: 401 })
  }
  const response = NextResponse.json({ success: true })
  response.cookies.set(ACCESS_COOKIE, await accessDigest(configured), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" })
  return response
}

export function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" })
  return response
}
