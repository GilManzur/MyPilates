import { shiftYearMonth, formatMonthTitle } from '../lib/dates'
import { Button } from './Button'

export function MonthSwitcher({
  yearMonth,
  onChange,
}: {
  yearMonth: string
  onChange: (next: string) => void
}) {
  return (
    <div className="month-switcher">
      <Button
        variant="ghost"
        className="month-switcher__nav"
        aria-label="חודש הבא"
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
