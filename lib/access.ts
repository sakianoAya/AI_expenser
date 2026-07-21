export const ACCESS_COOKIE = "dailyapp_access"

export async function accessDigest(password: string) {
  const bytes = new TextEncoder().encode(`dailyapp:v1:${password}`)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}
