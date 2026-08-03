import type { HourEntry, Lesson, Payment, Studio, StudioMonthSummary } from '../../types'

export function hoursFromLesson(lesson: Pick<Lesson, 'startAt' | 'endAt' | 'durationHours'>): number {
  if (lesson.durationHours > 0) return roundHours(lesson.durationHours)
  const ms = new Date(lesson.endAt).getTime() - new Date(lesson.startAt).getTime()
  return roundHours(Math.max(0, ms / (1000 * 60 * 60)))
}

export function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100
}

export function isInYearMonth(isoDate: string, yearMonth: string): boolean {
  return isoDate.slice(0, 7) === yearMonth
}

export function filterHoursForMonth(entries: HourEntry[], yearMonth: string): HourEntry[] {
  return entries.filter((entry) => isInYearMonth(entry.date, yearMonth))
}

export function totalHoursForStudio(
  entries: HourEntry[],
  studioId: string,
  yearMonth: string,
): number {
  return roundHours(
    filterHoursForMonth(entries, yearMonth)
      .filter((entry) => entry.studioId === studioId)
      .reduce((sum, entry) => sum + entry.hours, 0),
  )
}

export function amountForHours(hours: number, hourlyRate: number): number {
  return Math.round(hours * hourlyRate * 100) / 100
}

export function paymentDocId(studioId: string, yearMonth: string): string {
  return `${studioId}_${yearMonth}`
}

export function buildMonthSummaries(
  studios: Studio[],
  entries: HourEntry[],
  payments: Payment[],
  yearMonth: string,
): StudioMonthSummary[] {
  const activeStudios = studios.filter((studio) => studio.active)
  return activeStudios
    .map((studio) => {
      const totalHours = totalHoursForStudio(entries, studio.id, yearMonth)
      const payment = payments.find(
        (item) => item.studioId === studio.id && item.yearMonth === yearMonth,
      )
      return {
        studioId: studio.id,
        studioName: studio.name,
        hourlyRate: studio.hourlyRate,
        totalHours,
        amount: amountForHours(totalHours, studio.hourlyRate),
        paymentStatus: payment?.status ?? 'pending',
        paymentId: payment?.id,
      }
    })
    .filter((summary) => summary.totalHours > 0)
}

export function totalAmount(summaries: StudioMonthSummary[]): number {
  return Math.round(summaries.reduce((sum, item) => sum + item.amount, 0) * 100) / 100
}

export function pendingAmount(summaries: StudioMonthSummary[]): number {
  return Math.round(
    summaries
      .filter((item) => item.paymentStatus !== 'confirmed')
      .reduce((sum, item) => sum + item.amount, 0) * 100,
  ) / 100
}

export function currentYearMonth(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function formatILS(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(amount)
}
