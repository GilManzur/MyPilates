import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { Field, TextInput, TextSelect } from '../components/Field'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { ConfirmSheet, type ConfirmRequest } from '../components/ConfirmSheet'
import { useStudios } from '../hooks/useStudios'
import { useLessons } from '../hooks/useLessons'
import { useHourEntries } from '../hooks/useHourEntries'
import { DEFAULT_STUDIO_COLOR } from '../lib/data/types'
import { formatILS } from '../lib/money/calculations'
import {
  defaultDateInMonth,
  formatLessonTime,
  formatShortDate,
  fromLocalDateAndTime,
} from '../lib/dates'
import { buildWeeklyOccurrences, defaultWeeklyUntilDate } from '../lib/recurrence'
import { useViewMonth } from '../contexts/ViewMonthContext'

export function HoursPage() {
  const { yearMonth, setYearMonth } = useViewMonth()
  const { studios } = useStudios()
  const { lessons, loading: lessonsLoading, refresh: refreshLessons, saveLesson, saveWeeklyLessons } =
    useLessons(yearMonth)
  const { entries, loading: hoursLoading, confirmLessonHours, removeEntry } = useHourEntries(yearMonth)
  const [studioId, setStudioId] = useState('')
  const [date, setDate] = useState(() => defaultDateInMonth(yearMonth))
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('11:00')
  const [title, setTitle] = useState('שיעור פילאטיס')
  const [isSwap, setIsSwap] = useState(false)
  const [weekly, setWeekly] = useState(false)
  const [untilDate, setUntilDate] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const confirmRemoveEntry = (entryId: string) =>
    setConfirm({
      title: 'למחוק את רשומת השעות?',
      message: 'הרשומה תוסר מהחודש. אם היא הגיעה משיעור, ניתן לאשר אותו שוב מאוחר יותר.',
      confirmLabel: 'מחקי',
      onConfirm: () => void removeEntry(entryId),
    })

  const studioMap = useMemo(
    () => Object.fromEntries(studios.map((studio) => [studio.id, studio])),
    [studios],
  )

  const selectedStudio = studioMap[studioId || studios[0]?.id || '']
  const swapAvailable = (selectedStudio?.swapPay ?? 0) > 0

  useEffect(() => {
    setDate((prev) => (prev.startsWith(yearMonth) ? prev : defaultDateInMonth(yearMonth)))
  }, [yearMonth])

  useEffect(() => {
    if (!swapAvailable) setIsSwap(false)
  }, [swapAvailable])

  const weeklyCount = useMemo(() => {
    if (!weekly || !date || !startTime || !endTime || !untilDate) return 0
    const startAt = fromLocalDateAndTime(date, startTime)
    const endAt = fromLocalDateAndTime(date, endTime)
    if (new Date(endAt) <= new Date(startAt)) return 0
    return buildWeeklyOccurrences(startAt, endAt, untilDate).length
  }, [weekly, date, startTime, endTime, untilDate])

  const now = Date.now()
  const unconfirmed = lessons.filter(
    (lesson) =>
      !lesson.hoursConfirmed &&
      lesson.status !== 'cancelled' &&
      new Date(lesson.endAt).getTime() <= now,
  )

  const onLessonSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    const selectedId = studioId || studios[0]?.id
    if (!selectedId) {
      setError('בחרי סטודיו')
      return
    }
    if (!date || !startTime || !endTime) {
      setError('בחרי תאריך ושעות')
      return
    }
    const startAt = fromLocalDateAndTime(date, startTime)
    const endAt = fromLocalDateAndTime(date, endTime)
    if (new Date(endAt) <= new Date(startAt)) {
      setError('שעת הסיום חייבת להיות אחרי ההתחלה')
      return
    }

    setSaving(true)
    try {
      if (weekly) {
        if (!untilDate) {
          setError('בחרי תאריך סיום לסדרה')
          return
        }
        const count = await saveWeeklyLessons({
          studioId: selectedId,
          title,
          startAt,
          endAt,
          untilDate,
          isSwap: swapAvailable && isSwap,
        })
        if (count === 0) {
          setError('לא נוצרו שיעורים — בדקי את טווח התאריכים')
          return
        }
        setMessage(`נוספו ${count} שיעורים ליומן`)
      } else {
        await saveLesson({
          studioId: selectedId,
          title,
          startAt,
          endAt,
          isSwap: swapAvailable && isSwap,
        })
        setMessage('השיעור נוסף ליומן')
      }
      setTitle('שיעור פילאטיס')
      setIsSwap(false)
      setWeekly(false)
      setUntilDate('')
    } finally {
      setSaving(false)
    }
  }

  const onConfirmLesson = async (lessonId: string) => {
    const lesson = lessons.find((item) => item.id === lessonId)
    if (!lesson) return
    await confirmLessonHours(lesson)
    await refreshLessons()
    setMessage('שעות השיעור אושרו')
  }

  return (
    <div className="stack app-desk-dash">
      <div className="page-head">
        <div>
          <p className="eyebrow">דיווח שעות</p>
          <h1>שעות שבוצעו</h1>
        </div>
      </div>

      <MonthSwitcher yearMonth={yearMonth} onChange={setYearMonth} />
      {message && <p className="toast">{message}</p>}

      <section className="panel">
        <h2>אישור משיעור ביומן</h2>
        {lessonsLoading ? (
          <p className="empty">טוען…</p>
        ) : unconfirmed.length === 0 ? (
          <p className="empty">אין שיעורים שממתינים לאישור שעות.</p>
        ) : (
          <ul className="list">
            {unconfirmed.map((lesson) => (
              <li key={lesson.id} className="list-item">
                <span
                  className="color-dot"
                  style={{ background: studioMap[lesson.studioId]?.color ?? DEFAULT_STUDIO_COLOR }}
                />
                <div className="list-item__body">
                  <p className="list-item__title">{lesson.title}</p>
                  <p className="list-item__meta">
                    {studioMap[lesson.studioId]?.name ?? 'סטודיו'} ·{' '}
                    {formatLessonTime(lesson.startAt)} · {lesson.durationHours} שע׳
                  </p>
                </div>
                <IconButton
                  label="אשר שעות"
                  icon="check"
                  variant="primary"
                  onClick={() => void onConfirmLesson(lesson.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>הוספת שיעור ליומן</h2>
        <p className="hint">השיעור יישמר ביומן. אחרי שהוא מתקיים אפשר לאשר כאן את השעות.</p>
        <form className="stack-sm" onSubmit={(e) => void onLessonSubmit(e)}>
          <Field label="סטודיו">
            <TextSelect
              required
              value={studioId || studios[0]?.id || ''}
              onChange={(e) => {
                const nextId = e.target.value
                const studio = studioMap[nextId]
                setStudioId(nextId)
                if ((studio?.swapPay ?? 0) <= 0) setIsSwap(false)
              }}
              disabled={studios.length === 0}
            >
              {studios.map((studio) => (
                <option key={studio.id} value={studio.id}>
                  {studio.name} ({formatILS(studio.hourlyRate)}/שעה)
                </option>
              ))}
            </TextSelect>
          </Field>
          <Field label="שם שיעור">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="שיעור פילאטיס"
            />
          </Field>
          <Field label="תאריך">
            <TextInput
              type="date"
              required
              value={date}
              onChange={(e) => {
                const next = e.target.value
                setDate(next)
                if (weekly && next && startTime) {
                  setUntilDate(defaultWeeklyUntilDate(fromLocalDateAndTime(next, startTime)))
                }
              }}
            />
          </Field>
          <div className="time-fields">
            <Field label="התחלה">
              <TextInput
                type="time"
                required
                value={startTime}
                onChange={(e) => {
                  const next = e.target.value
                  setStartTime(next)
                  if (weekly && date && next) {
                    setUntilDate(defaultWeeklyUntilDate(fromLocalDateAndTime(date, next)))
                  }
                }}
              />
            </Field>
            <Field label="סיום">
              <TextInput
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </Field>
          </div>
          {swapAvailable && (
            <label className="check-field">
              <input
                type="checkbox"
                checked={isSwap}
                onChange={(e) => setIsSwap(e.target.checked)}
              />
              <span>
                <strong>החלפה</strong>
                <span className="check-field__hint">
                  תעריף {formatILS(selectedStudio?.swapPay ?? 0)} לשעה
                </span>
              </span>
            </label>
          )}
          <label className="check-field">
            <input
              type="checkbox"
              checked={weekly}
              onChange={(e) => {
                const next = e.target.checked
                setWeekly(next)
                if (next && date && startTime) {
                  setUntilDate(defaultWeeklyUntilDate(fromLocalDateAndTime(date, startTime)))
                }
              }}
            />
            <span>
              <strong>שיעור קבוע</strong>
              <span className="check-field__hint">כל אותו יום ושעה בשבוע</span>
            </span>
          </label>
          {weekly && (
            <Field label="עד תאריך">
              <TextInput
                type="date"
                required
                value={untilDate}
                min={date || undefined}
                onChange={(e) => setUntilDate(e.target.value)}
              />
            </Field>
          )}
          {weekly && weeklyCount > 0 && (
            <p className="form-hint">ייווצרו {weeklyCount} שיעורים ביומן</p>
          )}
          {error && <p className="form-error">{error}</p>}
          <Button type="submit" disabled={studios.length === 0 || saving}>
            {saving
              ? 'שומר…'
              : weekly && weeklyCount > 0
                ? `שמירת ${weeklyCount} שיעורים`
                : 'שמור שיעור'}
          </Button>
        </form>
      </section>

      <section className="panel">
        <h2>רשומות החודש</h2>
        {hoursLoading ? (
          <p className="empty">טוען…</p>
        ) : entries.length === 0 ? (
          <p className="empty">עדיין אין שעות בחודש הזה.</p>
        ) : (
          <ul className="list">
            {entries.map((entry) => (
              <li key={entry.id} className="list-item">
                <span
                  className="color-dot"
                  style={{ background: studioMap[entry.studioId]?.color ?? DEFAULT_STUDIO_COLOR }}
                />
                <div className="list-item__body">
                  <p className="list-item__title">
                    {entry.hours} שע׳ · {studioMap[entry.studioId]?.name ?? 'סטודיו'}
                  </p>
                  <p className="list-item__meta">
                    {formatShortDate(entry.date)} · {entry.source === 'lesson' ? 'משיעור' : 'ידני'}
                    {entry.note ? ` · ${entry.note}` : ''}
                    {entry.isSwap ? ' · החלפה' : ''}
                  </p>
                </div>
                <IconButton
                  label="מחק"
                  icon="trash"
                  variant="danger"
                  onClick={() => confirmRemoveEntry(entry.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmSheet request={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
