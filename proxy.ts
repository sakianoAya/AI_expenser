import { NextResponse, type NextRequest } from "next/server"
import { ACCESS_COOKIE, accessDigest } from "@/lib/access"

export async function proxy(request: NextRequest) {
  const password = process.env.APP_ACCESS_PASSWORD
  if (!password) {
    if (process.env.NODE_ENV === "production") return new NextResponse("APP_ACCESS_PASSWORD is not configured", { status: 503 })
    return NextResponse.next()
  }
  const pathname = request.nextUrl.pathname
  if (pathname === "/unlock" || pathname === "/api/access") return NextResponse.next()
  const valid = request.cookies.get(ACCESS_COOKIE)?.value === await accessDigest(password)
  if (valid) return NextResponse.next()
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.redirect(new URL("/unlock", request.url))
}

export const config = { matcher: ["/dashboard/:path*", "/api/:path*"] }
