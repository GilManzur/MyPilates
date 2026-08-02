import { useCallback, useEffect, useState } from 'react'
import { getRepository } from '../lib/data'
import { createId } from '../lib/data/types'
import { dateOnly } from '../lib/dates'
import { hoursFromLesson } from '../lib/money/calculations'
import type { HourEntry, Lesson } from '../types'
import { useAuth } from '../contexts/AuthContext'

export function useHourEntries(yearMonth: string) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<HourEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    const list = await getRepository().listHourEntries(user.uid, yearMonth)
    setEntries(list)
    setLoading(false)
  }, [user, yearMonth])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addManualHours = async (input: {
    studioId: string
    date: string
    hours: number
    note?: string
  }) => {
    if (!user) return
    const entry: HourEntry = {
      id: createId('hour'),
      studioId: input.studioId,
      date: dateOnly(input.date),
      hours: input.hours,
      source: 'manual',
      note: input.note,
      createdAt: new Date().toISOString(),
    }
    await getRepository().upsertHourEntry(user.uid, entry)
    await refresh()
  }

  const confirmLessonHours = async (lesson: Lesson) => {
    if (!user || lesson.hoursConfirmed) return
    const hours = hoursFromLesson(lesson)
    const entry: HourEntry = {
      id: createId('hour'),
      studioId: lesson.studioId,
      date: dateOnly(lesson.startAt),
      hours,
      source: 'lesson',
      lessonId: lesson.id,
      note: lesson.title,
      createdAt: new Date().toISOString(),
    }
    await getRepository().upsertHourEntry(user.uid, entry)
    await getRepository().upsertLesson(user.uid, {
      ...lesson,
      hoursConfirmed: true,
      status: 'completed',
    })
    await refresh()
  }

  const removeEntry = async (entryId: string) => {
    if (!user) return
    await getRepository().deleteHourEntry(user.uid, entryId)
    await refresh()
  }

  return { entries, loading, refresh, addManualHours, confirmLessonHours, removeEntry }
}
