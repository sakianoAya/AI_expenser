import { ExpensesView } from "@/components/expenses-view"
import { Suspense } from "react"

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExpensesView />
    </Suspense>
  )
}
