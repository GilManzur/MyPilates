import { useCallback, useEffect, useState } from 'react'
import { getRepository } from '../lib/data'
import { paymentDocId } from '../lib/money/calculations'
import type { Payment } from '../types'
import { useAuth } from '../contexts/AuthContext'

export function usePayments(yearMonth: string) {
  const { user } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setPayments([])
      setLoading(false)
      return
    }
    setLoading(true)
    const list = await getRepository().listPayments(user.uid, yearMonth)
    setPayments(list)
    setLoading(false)
  }, [user, yearMonth])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const confirmPayment = async (studioId: string, expectedAmount: number) => {
    if (!user) return
    const payment: Payment = {
      id: paymentDocId(studioId, yearMonth),
      studioId,
      yearMonth,
      expectedAmount,
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
    }
    await getRepository().upsertPayment(user.uid, payment)
    await refresh()
  }

  const unconfirmPayment = async (studioId: string, expectedAmount: number) => {
    if (!user) return
    const payment: Payment = {
      id: paymentDocId(studioId, yearMonth),
      studioId,
      yearMonth,
      expectedAmount,
      status: 'pending',
    }
    await getRepository().upsertPayment(user.uid, payment)
    await refresh()
  }

  return { payments, loading, refresh, confirmPayment, unconfirmPayment }
}
