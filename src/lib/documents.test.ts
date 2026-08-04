import { describe, expect, it } from 'vitest'
import {
  buildMonthlyLineItems,
  documentTypeLabel,
  lineItemsTotal,
  paymentMethodLabel,
  paymentsTotal,
} from './documents'
import { formatILSExact } from './money/calculations'

describe('buildMonthlyLineItems', () => {
  const base = {
    totalHours: 8,
    hourlyRate: 150,
    hoursAmount: 1200,
    travelDays: 0,
    travelPay: 0,
    travelAmount: 0,
  }

  it('builds a single hours line when there is no travel pay', () => {
    const items = buildMonthlyLineItems(base, 'אוגוסט 2026')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ quantity: 8, unitPrice: 150, amount: 1200 })
    expect(items[0].description).toContain('אוגוסט 2026')
  })

  it('adds a travel line when travel pay applies', () => {
    const items = buildMonthlyLineItems(
      { ...base, travelDays: 4, travelPay: 30, travelAmount: 120 },
      'אוגוסט 2026',
    )
    expect(items).toHaveLength(2)
    expect(items[1]).toMatchObject({ quantity: 4, unitPrice: 30, amount: 120 })
    expect(lineItemsTotal(items)).toBe(1320)
  })
})

describe('totals', () => {
  it('sums line items to 2 decimals', () => {
    expect(
      lineItemsTotal([
        { description: 'a', quantity: 1, unitPrice: 10.1, amount: 10.1 },
        { description: 'b', quantity: 1, unitPrice: 5.05, amount: 5.05 },
      ]),
    ).toBe(15.15)
  })

  it('sums payments', () => {
    expect(
      paymentsTotal([
        { method: 'cash', amount: 100 },
        { method: 'transfer', amount: 50.5 },
      ]),
    ).toBe(150.5)
  })
})

describe('labels', () => {
  it('labels document types in Hebrew', () => {
    expect(documentTypeLabel('receipt')).toBe('קבלה')
    expect(documentTypeLabel('cancellation')).toBe('ביטול קבלה')
    expect(documentTypeLabel('refund')).toBe('קבלה על החזר כספי')
  })

  it('labels payment methods', () => {
    expect(paymentMethodLabel('check')).toBe('המחאה')
    expect(paymentMethodLabel('transfer')).toBe('העברה בנקאית')
  })
})

describe('formatILSExact', () => {
  it('keeps two decimals (agorot)', () => {
    expect(formatILSExact(150)).toContain('150.00')
    expect(formatILSExact(1234.5)).toContain('1,234.50')
  })
})
