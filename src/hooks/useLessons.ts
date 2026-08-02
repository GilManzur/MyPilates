import { useCallback, useEffect, useState } from 'react'
import { getRepository } from '../lib/data'
import { createId } from '../lib/data/types'
import { hoursFromLesson } from '../lib/money/calculations'
import type { Lesson } from '../types'
import { useAuth } from '../contexts/AuthContext'

export function useLessons(yearMonth: string) {
  const { user } = useAuth()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setLessons([])
      setLoading(false)
      return
    }
    setLoading(true)
    const list = await getRepository().listLessons(user.uid, yearMonth)
    setLessons(list)
    setLoading(false)
  }, [user, yearMonth])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveLesson = async (input: {
    id?: string
    studioId: string
    title: string
    startAt: string
    endAt: string
    status?: Lesson['status']
    hoursConfirmed?: boolean
  }) => {
    if (!user) return
    const existing = input.id ? lessons.find((l) => l.id === input.id) : undefined
    const durationHours = hoursFromLesson({
      startAt: input.startAt,
      endAt: input.endAt,
      durationHours: 0,
    })
    const lesson: Lesson = {
      id: input.id ?? createId('lesson'),
      studioId: input.studioId,
      title: input.title.trim() || 'שיעור פילאטיס',
      startAt: input.startAt,
      endAt: input.endAt,
      durationHours,
      status: input.status ?? existing?.status ?? 'scheduled',
      hoursConfirmed: input.hoursConfirmed ?? existing?.hoursConfirmed ?? false,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }
    await getRepository().upsertLesson(user.uid, lesson)
    await refresh()
    return lesson
  }

  const removeLesson = async (lessonId: string) => {
    if (!user) return
    await getRepository().deleteLesson(user.uid, lessonId)
    await refresh()
  }

  return { lessons, loading, refresh, saveLesson, removeLesson }
}
