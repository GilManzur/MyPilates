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

export function studioTravelPay(studio: Pick<Studio, 'travelPay'>): number {
  const value = studio.travelPay ?? 0
  return value > 0 ? value : 0
}

/** Unique work days with at least one hour entry for the studio in the month. */
export function workDaysForStudio(
  entries: HourEntry[],
  studioId: string,
  yearMonth: string,
): number {
  const days = new Set(
    filterHoursForMonth(entries, yearMonth)
      .filter((entry) => entry.studioId === studioId)
      .map((entry) => entry.date.slice(0, 10)),
  )
  return days.size
}

export function amountForTravel(travelDays: number, travelPay: number): number {
  if (travelPay <= 0 || travelDays <= 0) return 0
  return Math.round(travelDays * travelPay * 100) / 100
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
      const travelPay = studioTravelPay(studio)
      const travelDays = travelPay > 0 ? workDaysForStudio(entries, studio.id, yearMonth) : 0
      const hoursAmount = amountForHours(totalHours, studio.hourlyRate)
      const travelAmount = amountForTravel(travelDays, travelPay)
      const payment = payments.find(
        (item) => item.studioId === studio.id && item.yearMonth === yearMonth,
      )
      return {
        studioId: studio.id,
        studioName: studio.name,
        hourlyRate: studio.hourlyRate,
        totalHours,
        travelPay,
        travelDays,
        travelAmount,
        hoursAmount,
        amount: Math.round((hoursAmount + travelAmount) * 100) / 100,
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

/** Exact ILS with agorot — for legal documents where rounding is not allowed. */
export function formatILSExact(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
