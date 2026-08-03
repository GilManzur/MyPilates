import { format, parseISO } from 'date-fns'
import { he } from 'date-fns/locale'

export function formatLessonTime(iso: string): string {
  return format(parseISO(iso), 'EEEE d בMMMM · HH:mm', { locale: he })
}

export function formatShortDate(isoDate: string): string {
  return format(parseISO(isoDate), 'd בMMMM', { locale: he })
}

export function formatMonthTitle(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  return format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: he })
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function toLocalInputValue(iso: string): string {
  const date = parseISO(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString()
}

export function dateOnly(isoOrDate: string): string {
  return isoOrDate.slice(0, 10)
}

/** Local calendar day for an ISO datetime (avoids UTC day shifts). */
export function localDateKey(iso: string): string {
  const date = parseISO(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayLocalKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatLessonClock(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

/** Week starts Sunday (he-IL). */
export function buildMonthGrid(yearMonth: string): { date: string; inMonth: boolean }[] {
  const [year, month] = yearMonth.split('-').map(Number)
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startPad = first.getDay() // 0 = Sunday
  const cells: { date: string; inMonth: boolean }[] = []
  const pad = (n: number) => String(n).padStart(2, '0')

  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month - 1, -startPad + i + 1)
    cells.push({
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      inMonth: false,
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: `${year}-${pad(month)}-${pad(day)}`,
      inMonth: true,
    })
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]
    const d = new Date(`${last.date}T12:00:00`)
    d.setDate(d.getDate() + 1)
    cells.push({
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      inMonth: false,
    })
  }

  return cells
}

export const WEEKDAY_LABELS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
