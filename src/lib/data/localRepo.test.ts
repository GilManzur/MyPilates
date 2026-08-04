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

  it('assigns a strictly increasing, gap-free number per document', async () => {
    const repo = createLocalRepository()
    const a = await repo.issueDocument(uid, draft())
    const b = await repo.issueDocument(uid, draft({ type: 'invoice' }))
    const c = await repo.issueDocument(uid, draft({ type: 'demand' }))
    expect([a.number, b.number, c.number]).toEqual([1, 2, 3])
  })

  it('lists documents newest-number first', async () => {
    const repo = createLocalRepository()
    await repo.issueDocument(uid, draft())
    await repo.issueDocument(uid, draft())
    const list = await repo.listDocuments(uid)
    expect(list.map((d) => d.number)).toEqual([2, 1])
  })

  it('cancellation issues a new number and marks the original cancelled without deleting', async () => {
    const repo = createLocalRepository()
    const original = await repo.issueDocument(uid, draft())
    const cancellation = await repo.cancelDocument(
      uid,
      original.id,
      draft({ type: 'cancellation', relatedNumber: original.number, total: 0, lineItems: [] }),
    )

    expect(cancellation.number).toBe(2)
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
})
