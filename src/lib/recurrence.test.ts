import { describe, expect, it } from 'vitest'
import { buildWeeklyOccurrences, defaultWeeklyUntilDate } from './recurrence'

describe('buildWeeklyOccurrences', () => {
  it('creates weekly slots on the same weekday and time', () => {
    const startAt = new Date(2026, 7, 3, 10, 0, 0).toISOString() // Mon Aug 3 2026 10:00
    const endAt = new Date(2026, 7, 3, 11, 0, 0).toISOString()
    const until = '2026-08-24'

    const result = buildWeeklyOccurrences(startAt, endAt, until)

    expect(result).toHaveLength(4)
    expect(new Date(result[0].startAt).getDay()).toBe(1)
    expect(new Date(result[1].startAt).getDate()).toBe(10)
    expect(new Date(result[2].startAt).getDate()).toBe(17)
    expect(new Date(result[3].startAt).getDate()).toBe(24)
    expect(new Date(result[0].startAt).getHours()).toBe(10)
    expect(new Date(result[0].endAt).getHours()).toBe(11)
  })

  it('includes the until date when it falls on the same weekday', () => {
    const startAt = new Date(2026, 7, 5, 18, 30, 0).toISOString()
    const endAt = new Date(2026, 7, 5, 19, 30, 0).toISOString()
    const result = buildWeeklyOccurrences(startAt, endAt, '2026-08-05')
    expect(result).toHaveLength(1)
  })

  it('returns empty when end is before start', () => {
    const startAt = new Date(2026, 7, 3, 11, 0, 0).toISOString()
    const endAt = new Date(2026, 7, 3, 10, 0, 0).toISOString()
    expect(buildWeeklyOccurrences(startAt, endAt, '2026-09-01')).toEqual([])
  })

  it('caps at 52 occurrences', () => {
    const startAt = new Date(2026, 0, 5, 9, 0, 0).toISOString()
    const endAt = new Date(2026, 0, 5, 10, 0, 0).toISOString()
    const result = buildWeeklyOccurrences(startAt, endAt, '2028-01-01')
    expect(result).toHaveLength(52)
  })
})

describe('defaultWeeklyUntilDate', () => {
  it('returns 7 weeks after start as YYYY-MM-DD', () => {
    const startAt = new Date(2026, 7, 3, 10, 0, 0).toISOString()
    expect(defaultWeeklyUntilDate(startAt)).toBe('2026-09-21')
  })
})
