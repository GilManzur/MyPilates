import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { currentYearMonth } from '../lib/money/calculations'

interface ViewMonthContextValue {
  yearMonth: string
  setYearMonth: (next: string) => void
}

const ViewMonthContext = createContext<ViewMonthContextValue | null>(null)

export function ViewMonthProvider({ children }: { children: ReactNode }) {
  const [yearMonth, setYearMonth] = useState(currentYearMonth)
  const value = useMemo(() => ({ yearMonth, setYearMonth }), [yearMonth])
  return <ViewMonthContext.Provider value={value}>{children}</ViewMonthContext.Provider>
}

export function useViewMonth() {
  const ctx = useContext(ViewMonthContext)
  if (!ctx) throw new Error('useViewMonth must be used within ViewMonthProvider')
  return ctx
}
