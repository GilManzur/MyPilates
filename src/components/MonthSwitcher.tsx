import { shiftYearMonth, formatMonthTitle } from '../lib/dates'
import { currentYearMonth } from '../lib/money/calculations'
import { Button } from './Button'

export function MonthSwitcher({
  yearMonth,
  onChange,
}: {
  yearMonth: string
  onChange: (next: string) => void
}) {
  const canGoNext = yearMonth < currentYearMonth()

  return (
    <div className="month-switcher">
      <Button
        variant="ghost"
        className="month-switcher__nav"
        aria-label="חודש הבא"
        disabled={!canGoNext}
        onClick={() => onChange(shiftYearMonth(yearMonth, 1))}
      >
        ‹
      </Button>
      <h2 className="month-switcher__title">{formatMonthTitle(yearMonth)}</h2>
      <Button
        variant="ghost"
        className="month-switcher__nav"
        aria-label="חודש קודם"
        onClick={() => onChange(shiftYearMonth(yearMonth, -1))}
      >
        ›
      </Button>
    </div>
  )
}
