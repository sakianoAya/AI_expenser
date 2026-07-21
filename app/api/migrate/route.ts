import { NextResponse } from "next/server"

export function GET() {
  return NextResponse.json(
    { error: "Automatic database migrations are disabled. Use reviewed SQL migrations from /scripts." },
    { status: 410 },
  )
}
