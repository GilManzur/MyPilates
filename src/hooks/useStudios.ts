import { useCallback, useEffect, useState } from 'react'
import { getRepository } from '../lib/data'
import { createId, STUDIO_COLORS } from '../lib/data/types'
import type { Studio } from '../types'
import { useAuth } from '../contexts/AuthContext'

export function useStudios() {
  const { user } = useAuth()
  const [studios, setStudios] = useState<Studio[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setStudios([])
      setLoading(false)
      return
    }
    setLoading(true)
    const list = await getRepository().listStudios(user.uid)
    setStudios(
      list.map((studio) => ({
        ...studio,
        travelPay: studio.travelPay ?? 0,
        swapPay: studio.swapPay ?? 0,
      })),
    )
    setLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveStudio = async (input: {
    id?: string
    name: string
    hourlyRate: number
    color?: string
    travelPay?: number
    swapPay?: number
    phone?: string
    email?: string
  }) => {
    if (!user) return
    const existing = input.id ? studios.find((s) => s.id === input.id) : undefined
    const travelPay =
      input.travelPay !== undefined
        ? Math.max(0, input.travelPay)
        : (existing?.travelPay ?? 0)
    const swapPay =
      input.swapPay !== undefined
        ? Math.max(0, input.swapPay)
        : (existing?.swapPay ?? 0)
    const phone = input.phone !== undefined ? input.phone.trim() : existing?.phone
    const email = input.email !== undefined ? input.email.trim() : existing?.email
    const studio: Studio = {
      id: input.id ?? createId('studio'),
      name: input.name.trim(),
      hourlyRate: input.hourlyRate,
      currency: 'ILS',
      color: input.color ?? existing?.color ?? STUDIO_COLORS[studios.length % STUDIO_COLORS.length],
      travelPay,
      swapPay,
      active: existing?.active ?? true,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      // Only include optional contact fields when present (Firestore rejects undefined).
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
    }
    await getRepository().upsertStudio(user.uid, studio)
    await refresh()
  }

  const removeStudio = async (studioId: string) => {
    if (!user) return
    await getRepository().deleteStudio(user.uid, studioId)
    await refresh()
  }

  return { studios, loading, refresh, saveStudio, removeStudio }
}
