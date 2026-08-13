import { describe, expect, it } from 'vitest'
import {
  amountForHours,
  amountForTravel,
  buildMonthSummaries,
  coverageForStudioMonth,
  filterHoursForMonth,
  hoursFromLesson,
  pendingAmount,
  remainingEntriesForStudioMonth,
  totalAmount,
  totalHoursForStudio,
  workDaysForStudio,
} from './calculations'
import type { FinancialDocument, HourEntry, Payment, Studio } from '../../types'

function makeDoc(over: Partial<FinancialDocument> & Pick<FinancialDocument, 'type'>): FinancialDocument {
  return {
    id: over.id ?? 'doc1',
    number: over.number ?? 1,
    type: over.type,
    status: over.status ?? 'issued',
    issuedAt: '2026-08-10T00:00:00.000Z',
    createdAt: '2026-08-10T00:00:00.000Z',
    recipient: { name: 'סטודיו גלים', studioId: 's1' },
    lineItems: [],
    total: 0,
    currency: 'ILS',
    business: { legalName: 'עסק', taxId: '1' },
    sourceRef: over.sourceRef,
  }
}

const studios: Studio[] = [
  {
    id: 's1',
    name: 'סטודיו גלים',
    hourlyRate: 150,
    currency: 'ILS',
    color: '#5B7C6A',
    travelPay: 0,
    swapPay: 0,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 's2',
    name: 'פילאטיס חוף',
    hourlyRate: 180,
    currency: 'ILS',
    color: '#6A8A9B',
    travelPay: 0,
    swapPay: 0,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

const entries: HourEntry[] = [
  {
    id: 'h1',
    studioId: 's1',
    date: '2026-08-05',
    hours: 1.5,
    source: 'lesson',
    lessonId: 'l1',
    createdAt: '2026-08-05T10:00:00.000Z',
  },
  {
    id: 'h2',
    studioId: 's1',
    date: '2026-08-12',
    hours: 2,
    source: 'manual',
    createdAt: '2026-08-12T10:00:00.000Z',
  },
  {
    id: 'h3',
    studioId: 's2',
    date: '2026-08-08',
    hours: 1,
    source: 'manual',
    createdAt: '2026-08-08T10:00:00.000Z',
  },
  {
    id: 'h4',
    studioId: 's1',
    date: '2026-07-20',
    hours: 3,
    source: 'manual',
    createdAt: '2026-07-20T10:00:00.000Z',
  },
]

describe('hoursFromLesson', () => {
  it('uses durationHours when present', () => {
    expect(
      hoursFromLesson({
        startAt: '2026-08-01T10:00:00.000Z',
        endAt: '2026-08-01T12:00:00.000Z',
        durationHours: 1.5,
      }),
    ).toBe(1.5)
  })

  it('falls back to start/end difference', () => {
    expect(
      hoursFromLesson({
        startAt: '2026-08-01T10:00:00.000Z',
        endAt: '2026-08-01T11:30:00.000Z',
        durationHours: 0,
      }),
    ).toBe(1.5)
  })
})

describe('month hour aggregations', () => {
  it('filters entries by year-month', () => {
    expect(filterHoursForMonth(entries, '2026-08')).toHaveLength(3)
  })

  it('sums hours per studio for a month', () => {
    expect(totalHoursForStudio(entries, 's1', '2026-08')).toBe(3.5)
    expect(totalHoursForStudio(entries, 's2', '2026-08')).toBe(1)
  })

  it('calculates amount from hours and rate', () => {
    expect(amountForHours(3.5, 150)).toBe(525)
    expect(amountForHours(1, 180)).toBe(180)
  })
})

describe('travel pay', () => {
  it('counts unique work days once even with multiple hour entries', () => {
    const sameDay: HourEntry[] = [
      {
        id: 'a',
        studioId: 's1',
        date: '2026-08-05',
        hours: 1,
        source: 'manual',
        createdAt: '2026-08-05T10:00:00.000Z',
      },
      {
        id: 'b',
        studioId: 's1',
        date: '2026-08-05',
        hours: 1,
        source: 'manual',
        createdAt: '2026-08-05T12:00:00.000Z',
      },
      {
        id: 'c',
        studioId: 's1',
        date: '2026-08-06',
        hours: 2,
        source: 'manual',
        createdAt: '2026-08-06T10:00:00.000Z',
      },
    ]
    expect(workDaysForStudio(sameDay, 's1', '2026-08')).toBe(2)
    expect(amountForTravel(2, 30)).toBe(60)
  })

  it('adds travel pay once per work day to month summary', () => {
    const withTravel: Studio[] = [{ ...studios[0], travelPay: 30 }, studios[1]]
    const summaries = buildMonthSummaries(withTravel, entries, [], '2026-08')
    const s1 = summaries.find((item) => item.studioId === 's1')
    expect(s1).toMatchObject({
      totalHours: 3.5,
      hoursAmount: 525,
      travelDays: 2,
      travelAmount: 60,
      amount: 585,
    })
  })

  it('skips travel when travelPay is zero', () => {
    const summaries = buildMonthSummaries(studios, entries, [], '2026-08')
    expect(summaries[0]).toMatchObject({
      travelDays: 0,
      travelAmount: 0,
      amount: 525,
    })
  })
})

describe('swap pay', () => {
  it('bills swap hours at swapPay and keeps travel on swap days', () => {
    const withSwap: Studio[] = [{ ...studios[0], swapPay: 200, travelPay: 30 }, studios[1]]
    const mixed: HourEntry[] = [
      {
        id: 'h1',
        studioId: 's1',
        date: '2026-08-05',
        hours: 1.5,
        source: 'lesson',
        lessonId: 'l1',
        createdAt: '2026-08-05T10:00:00.000Z',
      },
      {
        id: 'h2',
        studioId: 's1',
        date: '2026-08-12',
        hours: 2,
        source: 'lesson',
        lessonId: 'l2',
        isSwap: true,
        createdAt: '2026-08-12T10:00:00.000Z',
      },
    ]
    const summaries = buildMonthSummaries(withSwap, mixed, [], '2026-08')
    const s1 = summaries.find((item) => item.studioId === 's1')
    expect(s1).toMatchObject({
      totalHours: 3.5,
      regularHours: 1.5,
      hoursAmount: 225,
      swapHours: 2,
      swapPay: 200,
      swapAmount: 400,
      travelDays: 2,
      travelAmount: 60,
      amount: 685,
    })
  })

  it('treats all hours as regular when swapPay is zero', () => {
    const withFlag: HourEntry[] = [
      {
        id: 'h1',
        studioId: 's1',
        date: '2026-08-05',
        hours: 2,
        source: 'lesson',
        isSwap: true,
        createdAt: '2026-08-05T10:00:00.000Z',
      },
    ]
    const summaries = buildMonthSummaries(studios, withFlag, [], '2026-08')
    expect(summaries[0]).toMatchObject({
      totalHours: 2,
      regularHours: 2,
      hoursAmount: 300,
      swapHours: 0,
      swapAmount: 0,
      amount: 300,
    })
  })
})

describe('buildMonthSummaries', () => {
  it('builds summaries with pending payments by default', () => {
    const summaries = buildMonthSummaries(studios, entries, [], '2026-08')
    expect(summaries).toHaveLength(2)
    expect(summaries[0]).toMatchObject({
      studioId: 's1',
      totalHours: 3.5,
      amount: 525,
      paymentStatus: 'pending',
    })
    expect(totalAmount(summaries)).toBe(705)
    expect(pendingAmount(summaries)).toBe(705)
  })

  it('respects confirmed payments', () => {
    const payments: Payment[] = [
      {
        id: 's1_2026-08',
        studioId: 's1',
        yearMonth: '2026-08',
        expectedAmount: 525,
        status: 'confirmed',
        confirmedAt: '2026-09-01T00:00:00.000Z',
      },
    ]
    const summaries = buildMonthSummaries(studios, entries, payments, '2026-08')
    expect(pendingAmount(summaries)).toBe(180)
    expect(totalAmount(summaries)).toBe(705)
  })

  it('omits studios with no hours in the selected month', () => {
    const summaries = buildMonthSummaries(studios, entries, [], '2026-07')
    expect(summaries).toHaveLength(1)
    expect(summaries[0]).toMatchObject({
      studioId: 's1',
      totalHours: 3,
      amount: 450,
    })
  })
})

describe('studio-month coverage (delta billing)', () => {
  const ref = (entryIds?: string[]) => ({ studioId: 's1', yearMonth: '2026-08', entryIds })

  it('remaining excludes entries already covered by an issued receipt', () => {
    const docs = [makeDoc({ type: 'receipt', sourceRef: ref(['h1']) })]
    const remaining = remainingEntriesForStudioMonth(entries, docs, 's1', '2026-08', 'receipt')
    expect(remaining.map((e) => e.id)).toEqual(['h2'])
  })

  it('coverage is per document type (a receipt does not cover an invoice)', () => {
    const docs = [makeDoc({ type: 'receipt', sourceRef: ref(['h1']) })]
    const remainingInvoice = remainingEntriesForStudioMonth(entries, docs, 's1', '2026-08', 'invoice')
    expect(remainingInvoice.map((e) => e.id)).toEqual(['h1', 'h2'])
  })

  it('a cancelled receipt returns its entries to remaining (recoverable)', () => {
    const docs = [makeDoc({ type: 'receipt', status: 'cancelled', sourceRef: ref(['h1']) })]
    const remaining = remainingEntriesForStudioMonth(entries, docs, 's1', '2026-08', 'receipt')
    expect(remaining.map((e) => e.id)).toEqual(['h1', 'h2'])
  })

  it('a legacy whole-month document (no entryIds) covers everything', () => {
    const docs = [makeDoc({ type: 'receipt', sourceRef: ref(undefined) })]
    const { legacyFull } = coverageForStudioMonth(docs, 's1', '2026-08', 'receipt')
    expect(legacyFull).toBe(true)
    expect(remainingEntriesForStudioMonth(entries, docs, 's1', '2026-08', 'receipt')).toEqual([])
  })

  it('with no documents, everything is remaining', () => {
    const remaining = remainingEntriesForStudioMonth(entries, [], 's1', '2026-08', 'receipt')
    expect(remaining.map((e) => e.id)).toEqual(['h1', 'h2'])
  })
})
