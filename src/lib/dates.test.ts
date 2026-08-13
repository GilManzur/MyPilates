import { describe, expect, it } from 'vitest'
import { defaultDateInMonth } from './dates'

describe('defaultDateInMonth', () => {
  it('returns today when viewing the current month', () => {
    expect(defaultDateInMonth('2026-08', new Date(2026, 7, 13))).toBe('2026-08-13')
  })

  it('returns the 1st when viewing another month', () => {
    expect(defaultDateInMonth('2026-07', new Date(2026, 7, 13))).toBe('2026-07-01')
  })
})
