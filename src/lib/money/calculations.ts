import type {
  DocumentType,
  FinancialDocument,
  HourEntry,
  Lesson,
  Payment,
  Studio,
  StudioMonthSummary,
} from '../../types'

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

export function studioSwapPay(studio: Pick<Studio, 'swapPay'>): number {
  const value = studio.swapPay ?? 0
  return value > 0 ? value : 0
}

function studioEntriesForMonth(
  entries: HourEntry[],
  studioId: string,
  yearMonth: string,
): HourEntry[] {
  return filterHoursForMonth(entries, yearMonth).filter((entry) => entry.studioId === studioId)
}

/** Hours billed at the regular hourly rate (non-swap entries). */
export function regularHoursForStudio(
  entries: HourEntry[],
  studioId: string,
  yearMonth: string,
): number {
  return roundHours(
    studioEntriesForMonth(entries, studioId, yearMonth)
      .filter((entry) => !entry.isSwap)
      .reduce((sum, entry) => sum + entry.hours, 0),
  )
}

/** Hours billed at the studio swap rate. */
export function swapHoursForStudio(
  entries: HourEntry[],
  studioId: string,
  yearMonth: string,
): number {
  return roundHours(
    studioEntriesForMonth(entries, studioId, yearMonth)
      .filter((entry) => entry.isSwap === true)
      .reduce((sum, entry) => sum + entry.hours, 0),
  )
}

/** Unique work days with at least one hour entry for the studio in the month. */
export function workDaysForStudio(
  entries: HourEntry[],
  studioId: string,
  yearMonth: string,
): number {
  const days = new Set(
    studioEntriesForMonth(entries, studioId, yearMonth).map((entry) => entry.date.slice(0, 10)),
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
      const swapPay = studioSwapPay(studio)
      const swapHours = swapPay > 0 ? swapHoursForStudio(entries, studio.id, yearMonth) : 0
      const regularHours =
        swapPay > 0
          ? regularHoursForStudio(entries, studio.id, yearMonth)
          : totalHours
      const travelPay = studioTravelPay(studio)
      const travelDays = travelPay > 0 ? workDaysForStudio(entries, studio.id, yearMonth) : 0
      const hoursAmount = amountForHours(regularHours, studio.hourlyRate)
      const swapAmount = amountForHours(swapHours, swapPay)
      const travelAmount = amountForTravel(travelDays, travelPay)
      const payment = payments.find(
        (item) => item.studioId === studio.id && item.yearMonth === yearMonth,
      )
      return {
        studioId: studio.id,
        studioName: studio.name,
        hourlyRate: studio.hourlyRate,
        totalHours,
        regularHours,
        travelPay,
        travelDays,
        travelAmount,
        hoursAmount,
        swapPay,
        swapHours,
        swapAmount,
        amount: Math.round((hoursAmount + swapAmount + travelAmount) * 100) / 100,
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

/**
 * Coverage of a studio-month by already-issued documents of one type.
 * Sums the `entryIds` of every issued (non-cancelled) document of `docType`
 * whose sourceRef matches. A legacy document (sourceRef but no entryIds) is
 * treated as covering the whole studio-month (`legacyFull`), so we never
 * re-bill entries that an old whole-month document already covered.
 */
export function coverageForStudioMonth(
  documents: FinancialDocument[],
  studioId: string,
  yearMonth: string,
  docType: DocumentType,
): { entryIds: Set<string>; legacyFull: boolean } {
  const entryIds = new Set<string>()
  let legacyFull = false
  for (const doc of documents) {
    if (doc.status !== 'issued' || doc.type !== docType) continue
    const ref = doc.sourceRef
    if (!ref || ref.studioId !== studioId || ref.yearMonth !== yearMonth) continue
    if (ref.entryIds && ref.entryIds.length > 0) {
      ref.entryIds.forEach((id) => entryIds.add(id))
    } else {
      legacyFull = true
    }
  }
  return { entryIds, legacyFull }
}

/**
 * The hour entries of a studio-month not yet covered by a document of `docType`.
 * Empty when a legacy whole-month document already covers it.
 */
export function remainingEntriesForStudioMonth(
  entries: HourEntry[],
  documents: FinancialDocument[],
  studioId: string,
  yearMonth: string,
  docType: DocumentType,
): HourEntry[] {
  const { entryIds, legacyFull } = coverageForStudioMonth(documents, studioId, yearMonth, docType)
  if (legacyFull) return []
  return studioEntriesForMonth(entries, studioId, yearMonth).filter(
    (entry) => !entryIds.has(entry.id),
  )
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
