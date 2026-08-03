import { addWeeks, isAfter, parseISO, startOfDay } from 'date-fns'

const MAX_OCCURRENCES = 52

/**
 * Builds weekly occurrences from a first lesson slot until (and including)
 * the given local end date (YYYY-MM-DD). Caps at 52 weeks.
 */
export function buildWeeklyOccurrences(
  startAt: string,
  endAt: string,
  untilDate: string,
): { startAt: string; endAt: string }[] {
  const firstStart = parseISO(startAt)
  const firstEnd = parseISO(endAt)
  const durationMs = firstEnd.getTime() - firstStart.getTime()
  if (durationMs <= 0) return []

  const until = startOfDay(parseISO(`${untilDate}T12:00:00`))
  const occurrences: { startAt: string; endAt: string }[] = []

  for (let week = 0; week < MAX_OCCURRENCES; week++) {
    const occurrenceStart = addWeeks(firstStart, week)
    const occurrenceDay = startOfDay(occurrenceStart)
    if (isAfter(occurrenceDay, until)) break
    occurrences.push({
      startAt: occurrenceStart.toISOString(),
      endAt: new Date(occurrenceStart.getTime() + durationMs).toISOString(),
    })
  }

  return occurrences
}

/** Default until date: 7 weeks after the first start → 8 weekly occurrences. */
export function defaultWeeklyUntilDate(startAtIso: string): string {
  const date = addWeeks(parseISO(startAtIso), 7)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
