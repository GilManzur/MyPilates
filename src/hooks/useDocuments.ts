import { useCallback, useEffect, useState } from 'react'
import { getRepository } from '../lib/data'
import type { DocumentDraft } from '../lib/data/types'
import type { FinancialDocument } from '../types'
import { useAuth } from '../contexts/AuthContext'

export function useDocuments() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<FinancialDocument[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setDocuments([])
      setLoading(false)
      return
    }
    setLoading(true)
    const list = await getRepository().listDocuments(user.uid)
    setDocuments(list)
    setLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const issue = async (draft: DocumentDraft) => {
    if (!user) return undefined
    const issued = await getRepository().issueDocument(user.uid, draft)
    await refresh()
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

  return { documents, loading, refresh, issue, cancel, voidDoc }
}
