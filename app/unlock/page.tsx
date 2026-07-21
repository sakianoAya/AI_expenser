"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LockKeyhole, Loader2 } from "lucide-react"

export default function UnlockPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  async function unlock(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("")
    const response = await fetch("/api/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) })
    if (response.ok) { router.replace("/dashboard"); router.refresh() }
    else { const data = await response.json().catch(() => null); setError(data?.error || "無法解鎖"); setLoading(false) }
  }
  return <main className="mx-auto flex min-h-dvh w-full max-w-sm items-center px-6"><form onSubmit={unlock} className="surface-card w-full rounded-[1.75rem] p-6"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><LockKeyhole className="h-6 w-6" /></div><h1 className="mt-6 text-2xl font-bold">我的日常帳本</h1><p className="mt-2 text-sm text-muted-foreground">輸入 App 密碼以繼續。這個裝置會記住 30 天。</p><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus className="mt-6 h-12 w-full rounded-xl bg-secondary px-4 outline-none focus:ring-2 focus:ring-primary/30" placeholder="App 密碼" />{error && <p className="mt-2 text-sm text-destructive">{error}</p>}<button disabled={!password || loading} className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-40">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "解鎖"}</button></form></main>
}
