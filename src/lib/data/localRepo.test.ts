import { beforeEach, describe, expect, it } from 'vitest'
import { createLocalRepository } from './localRepo'
import type { DocumentDraft } from './types'

// In-memory localStorage shim (test env is 'node').
class MemStorage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null
  }
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value))
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  clear() {
    this.map.clear()
  }
}

globalThis.localStorage = new MemStorage() as unknown as Storage

const uid = 'user_1'

function draft(over: Partial<DocumentDraft> = {}): DocumentDraft {
  return {
    type: 'receipt',
    issuedAt: new Date().toISOString(),
    recipient: { name: 'לקוח' },
    lineItems: [{ description: 'שיעור', quantity: 1, unitPrice: 100, amount: 100 }],
    total: 100,
    currency: 'ILS',
    business: { legalName: 'העסק שלי', taxId: '123456782' },
    ...over,
  }
}

describe('local document numbering', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('keeps receipt, invoice, and demand on separate counters', async () => {
    const repo = createLocalRepository()
    const receipt = await repo.issueDocument(uid, draft())
    const demand = await repo.issueDocument(uid, draft({ type: 'demand' }))
    const invoice = await repo.issueDocument(uid, draft({ type: 'invoice' }))
    const receipt2 = await repo.issueDocument(uid, draft())
    const invoice2 = await repo.issueDocument(uid, draft({ type: 'invoice' }))
    const demand2 = await repo.issueDocument(uid, draft({ type: 'demand' }))
    expect(receipt.number).toBe(1)
    expect(demand.number).toBe(1)
    expect(invoice.number).toBe(1)
    expect(receipt2.number).toBe(2)
    expect(invoice2.number).toBe(2)
    expect(demand2.number).toBe(2)
    const counters = await repo.getDocumentCounters(uid)
    expect(counters).toEqual({ documentNumber: 2, invoiceNumber: 2, demandNumber: 2 })
  })

  it('lists documents newest-number first', async () => {
    const repo = createLocalRepository()
    await repo.issueDocument(uid, draft())
    await repo.issueDocument(uid, draft())
    const list = await repo.listDocuments(uid)
    expect(list.map((d) => d.number)).toEqual([2, 1])
  })

  it('cancellation issues a new legal number and marks the original cancelled without deleting', async () => {
    const repo = createLocalRepository()
    const original = await repo.issueDocument(uid, draft())
    const cancellation = await repo.cancelDocument(
      uid,
      original.id,
      draft({
        type: 'cancellation',
        relatedNumber: original.number,
        total: -original.total,
        lineItems: original.lineItems.map((item) => ({
          ...item,
          unitPrice: -item.unitPrice,
          amount: -item.amount,
        })),
      }),
    )

    expect(cancellation.number).toBe(2)
    expect(cancellation.total).toBe(-100)
    expect(cancellation.lineItems[0]?.amount).toBe(-100)
    const list = await repo.listDocuments(uid)
    expect(list).toHaveLength(2)
    const stored = list.find((d) => d.id === original.id)
    expect(stored?.status).toBe('cancelled')
    expect(stored?.number).toBe(1) // number preserved
  })

  it('does not reuse numbers across users independently', async () => {
    const repo = createLocalRepository()
    const a = await repo.issueDocument('user_a', draft())
    const b = await repo.issueDocument('user_b', draft())
    expect(a.number).toBe(1)
    expect(b.number).toBe(1)
    const a2 = await repo.issueDocument('user_a', draft())
    expect(a2.number).toBe(2)
  })

  it('setNextDocumentNumber seeds the next legal issue', async () => {
    const repo = createLocalRepository()
    await repo.setNextDocumentNumber(uid, 100)
    const issued = await repo.issueDocument(uid, draft())
    expect(issued.number).toBe(100)
    const demand = await repo.issueDocument(uid, draft({ type: 'demand' }))
    expect(demand.number).toBe(1)
    const invoice = await repo.issueDocument(uid, draft({ type: 'invoice' }))
    expect(invoice.number).toBe(1)
  })

  it('setNextDocumentNumber can seed invoices without affecting receipts', async () => {
    const repo = createLocalRepository()
    await repo.setNextDocumentNumber(uid, 50, 'invoiceNumber')
    const invoice = await repo.issueDocument(uid, draft({ type: 'invoice' }))
    const receipt = await repo.issueDocument(uid, draft())
    expect(invoice.number).toBe(50)
    expect(receipt.number).toBe(1)
  })

  it('voids invoice and demand in place but rejects voiding a receipt', async () => {
    const repo = createLocalRepository()
    const receipt = await repo.issueDocument(uid, draft())
    const invoice = await repo.issueDocument(uid, draft({ type: 'invoice' }))
    const demand = await repo.issueDocument(uid, draft({ type: 'demand' }))

    await repo.voidDocument(uid, invoice.id)
    await repo.voidDocument(uid, demand.id)
    await expect(repo.voidDocument(uid, receipt.id)).rejects.toThrow()

    // Records are kept (never deleted); invoice/demand are marked cancelled.
    const list = await repo.listDocuments(uid)
    expect(list).toHaveLength(3)
    const byId = Object.fromEntries(list.map((d) => [d.id, d.status]))
    expect(byId[invoice.id]).toBe('cancelled')
    expect(byId[demand.id]).toBe('cancelled')
    expect(byId[receipt.id]).toBe('issued')
  })

  it('stamps originalPrintedAt once and is idempotent thereafter', async () => {
    const repo = createLocalRepository()
    const receipt = await repo.issueDocument(uid, draft())
    expect(receipt.originalPrintedAt).toBeUndefined()

    const first = await repo.markOriginalPrinted(uid, receipt.id)
    const second = await repo.markOriginalPrinted(uid, receipt.id)
    expect(first).toBe(second)

    const [stored] = await repo.listDocuments(uid)
    expect(stored.originalPrintedAt).toBe(first)
  })

  it('rejects setNextDocumentNumber that would go backwards', async () => {
    const repo = createLocalRepository()
    await repo.issueDocument(uid, draft())
    await repo.issueDocument(uid, draft())
    await expect(repo.setNextDocumentNumber(uid, 2)).rejects.toThrow()
    await repo.setNextDocumentNumber(uid, 3)
    const next = await repo.issueDocument(uid, draft())
    expect(next.number).toBe(3)
  })
})
