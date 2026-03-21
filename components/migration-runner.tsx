"use client"

import { useEffect } from "react"

export function MigrationRunner() {
  useEffect(() => {
    // Run migration in background silently
    fetch("/api/migrate").catch(console.error)
  }, [])
  return null
}
