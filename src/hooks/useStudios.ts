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
    setStudios(list)
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
  }) => {
    if (!user) return
    const existing = input.id ? studios.find((s) => s.id === input.id) : undefined
    const studio: Studio = {
      id: input.id ?? createId('studio'),
      name: input.name.trim(),
      hourlyRate: input.hourlyRate,
      currency: 'ILS',
      color: input.color ?? existing?.color ?? STUDIO_COLORS[studios.length % STUDIO_COLORS.length],
      active: existing?.active ?? true,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
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
