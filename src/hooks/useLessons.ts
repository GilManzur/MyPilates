import { useCallback, useEffect, useState } from 'react'
import { getRepository } from '../lib/data'
import { createId } from '../lib/data/types'
import { hoursFromLesson } from '../lib/money/calculations'
import { buildWeeklyOccurrences } from '../lib/recurrence'
import type { Lesson } from '../types'
import { useAuth } from '../contexts/AuthContext'

type LessonInput = {
  id?: string
  studioId: string
  title: string
  startAt: string
  endAt: string
  status?: Lesson['status']
  hoursConfirmed?: boolean
  seriesId?: string
  isSwap?: boolean
}

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

  const buildLesson = (input: LessonInput, existing?: Lesson): Lesson => {
    const durationHours = hoursFromLesson({
      startAt: input.startAt,
      endAt: input.endAt,
      durationHours: 0,
    })
    return {
      id: input.id ?? createId('lesson'),
      studioId: input.studioId,
      title: input.title.trim() || 'שיעור פילאטיס',
      startAt: input.startAt,
      endAt: input.endAt,
      durationHours,
      status: input.status ?? existing?.status ?? 'scheduled',
      hoursConfirmed: input.hoursConfirmed ?? existing?.hoursConfirmed ?? false,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      isSwap: input.isSwap ?? existing?.isSwap ?? false,
      ...(input.seriesId || existing?.seriesId
        ? { seriesId: input.seriesId ?? existing?.seriesId }
        : {}),
    }
  }

  const saveLesson = async (input: LessonInput) => {
    if (!user) return
    const existing = input.id ? lessons.find((l) => l.id === input.id) : undefined
    const lesson = buildLesson(input, existing)
    await getRepository().upsertLesson(user.uid, lesson)
    await refresh()
    return lesson
  }

  /**
   * Creates one lesson per week from startAt through untilDate (inclusive).
   * Returns the number of lessons created.
   */
  const saveWeeklyLessons = async (input: {
    studioId: string
    title: string
    startAt: string
    endAt: string
    untilDate: string
    isSwap?: boolean
  }) => {
    if (!user) return 0
    const occurrences = buildWeeklyOccurrences(input.startAt, input.endAt, input.untilDate)
    if (occurrences.length === 0) return 0

    const seriesId = createId('series')
    const createdAt = new Date().toISOString()
    const repo = getRepository()

    for (const occurrence of occurrences) {
      const lesson = buildLesson({
        studioId: input.studioId,
        title: input.title,
        startAt: occurrence.startAt,
        endAt: occurrence.endAt,
        seriesId,
        isSwap: input.isSwap,
      })
      lesson.createdAt = createdAt
      await repo.upsertLesson(user.uid, lesson)
    }

    await refresh()
    return occurrences.length
  }

  const removeLesson = async (lessonId: string) => {
    if (!user) return
    const repo = getRepository()
    // Cascade: confirmed hours stay linked by lessonId — remove them too.
    const hourEntries = await repo.listHourEntries(user.uid)
    await Promise.all(
      hourEntries
        .filter((entry) => entry.lessonId === lessonId)
        .map((entry) => repo.deleteHourEntry(user.uid, entry.id)),
    )
    await repo.deleteLesson(user.uid, lessonId)
    await refresh()
  }

  return { lessons, loading, refresh, saveLesson, saveWeeklyLessons, removeLesson }
}
