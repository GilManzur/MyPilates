import { useCallback, useEffect, useState } from 'react'
import { getRepository } from '../lib/data'
import type { DocumentCounters, DocumentDraft } from '../lib/data/types'
import type { FinancialDocument } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { archiveReceiptDocument } from '../lib/share/archiveReceipt'

const EMPTY_COUNTERS: DocumentCounters = {
  documentNumber: 0,
  invoiceNumber: 0,
  demandNumber: 0,
}

export function useDocuments() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<FinancialDocument[]>([])
  const [counters, setCounters] = useState<DocumentCounters>(EMPTY_COUNTERS)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setDocuments([])
      setCounters(EMPTY_COUNTERS)
      setLoading(false)
      return
    }
    setLoading(true)
    const repo = getRepository()
    const [list, nextCounters] = await Promise.all([
      repo.listDocuments(user.uid),
      repo.getDocumentCounters(user.uid),
    ])
    setDocuments(list)
    setCounters(nextCounters)
    setLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const issue = async (draft: DocumentDraft) => {
    if (!user) return undefined
    const issued = await getRepository().issueDocument(user.uid, draft)
    await refresh()
    // Back up every issued receipt to Drive/Sheets (no-op if not configured).
    if (issued.type === 'receipt') void archiveReceiptDocument(issued)
    return issued
  }

  /** Issues a cancellation/refund document and marks the original cancelled. */
  const cancel = async (originalId: string, draft: DocumentDraft) => {
    if (!user) return undefined
    const issued = await getRepository().cancelDocument(user.uid, originalId, draft)
    await refresh()
    return issued
  }

  /** Voids an invoice or demand in place (marks cancelled, keeps the record). */
  const voidDoc = async (documentId: string) => {
    if (!user) return
    await getRepository().voidDocument(user.uid, documentId)
    await refresh()
  }

  /** Stamps the first-original-print timestamp (idempotent); returns it. */
  const markPrinted = async (documentId: string) => {
    if (!user) return undefined
    const stamp = await getRepository().markOriginalPrinted(user.uid, documentId)
    await refresh()
    return stamp
  }

  return { documents, counters, loading, refresh, issue, cancel, voidDoc, markPrinted }
}
