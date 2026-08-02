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
