import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Field, TextInput, TextSelect } from '../components/Field'
import { MonthCalendar } from '../components/MonthCalendar'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { useStudios } from '../hooks/useStudios'
import { useLessons } from '../hooks/useLessons'
import { currentYearMonth } from '../lib/money/calculations'
import {
  formatShortDate,
  fromLocalDateAndTime,
  localDateKey,
  localTimeFromIso,
} from '../lib/dates'
import { buildWeeklyOccurrences, defaultWeeklyUntilDate } from '../lib/recurrence'
import type { Lesson } from '../types'

const emptyForm = {
  studioId: '',
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  dateLocked: false,
  weekly: false,
  untilDate: '',
}

function nextHourSlot(now = new Date()) {
  const start = new Date(now)
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() + 1)
  const end = new Date(start)
  end.setHours(end.getHours() + 1)
  return { start, end }
}

export function CalendarPage() {
  const [yearMonth, setYearMonth] = useState(currentYearMonth())
  const { studios } = useStudios()
  const { lessons, loading, saveLesson, saveWeeklyLessons, removeLesson } = useLessons(yearMonth)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const weeklyCount = useMemo(() => {
    if (!form.weekly || !form.date || !form.startTime || !form.endTime || !form.untilDate) return 0
    const startAt = fromLocalDateAndTime(form.date, form.startTime)
    const endAt = fromLocalDateAndTime(form.date, form.endTime)
    if (new Date(endAt) <= new Date(startAt)) return 0
    return buildWeeklyOccurrences(startAt, endAt, form.untilDate).length
  }, [form.weekly, form.date, form.startTime, form.endTime, form.untilDate])

  const openCreate = (date?: string) => {
    if (date) {
      setEditingId(null)
      setForm({
        studioId: studios[0]?.id ?? '',
        title: 'שיעור פילאטיס',
        date,
        startTime: '10:00',
        endTime: '11:00',
        dateLocked: true,
        weekly: false,
        untilDate: defaultWeeklyUntilDate(fromLocalDateAndTime(date, '10:00')),
      })
    } else {
      const { start, end } = nextHourSlot()
      const dateKey = localDateKey(start.toISOString())
      setEditingId(null)
      setForm({
        studioId: studios[0]?.id ?? '',
        title: 'שיעור פילאטיס',
        date: dateKey,
        startTime: localTimeFromIso(start.toISOString()),
        endTime: localTimeFromIso(end.toISOString()),
        dateLocked: false,
        weekly: false,
        untilDate: defaultWeeklyUntilDate(start.toISOString()),
      })
    }
    setError('')
    setOpen(true)
  }

  const openEdit = (lesson: Lesson) => {
    setEditingId(lesson.id)
    setForm({
      studioId: lesson.studioId,
      title: lesson.title,
      date: localDateKey(lesson.startAt),
      startTime: localTimeFromIso(lesson.startAt),
      endTime: localTimeFromIso(lesson.endAt),
      dateLocked: false,
      weekly: false,
      untilDate: '',
    })
    setError('')
    setOpen(true)
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!form.studioId) {
      setError('בחרי סטודיו')
      return
    }
    if (!form.date || !form.startTime || !form.endTime) {
      setError('בחרי תאריך ושעות')
      return
    }
    const startAt = fromLocalDateAndTime(form.date, form.startTime)
    const endAt = fromLocalDateAndTime(form.date, form.endTime)
    if (new Date(endAt) <= new Date(startAt)) {
      setError('שעת הסיום חייבת להיות אחרי ההתחלה')
      return
    }

    setSaving(true)
    try {
      if (!editingId && form.weekly) {
        if (!form.untilDate) {
          setError('בחרי תאריך סיום לסדרה')
          return
        }
        const count = await saveWeeklyLessons({
          studioId: form.studioId,
          title: form.title,
          startAt,
          endAt,
          untilDate: form.untilDate,
        })
        if (count === 0) {
          setError('לא נוצרו שיעורים — בדקי את טווח התאריכים')
          return
        }
      } else {
        await saveLesson({
          id: editingId ?? undefined,
          studioId: form.studioId,
          title: form.title,
          startAt,
          endAt,
        })
      }
      setOpen(false)
      setForm(emptyForm)
    } finally {
      setSaving(false)
    }
  }

  const editingLesson = editingId ? lessons.find((item) => item.id === editingId) : null

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">יומן חודשי</p>
          <h1>שיעורים</h1>
        </div>
        <Button onClick={() => openCreate()} disabled={studios.length === 0}>
          שיעור חדש
        </Button>
      </div>

      <MonthSwitcher yearMonth={yearMonth} onChange={setYearMonth} />

      {studios.length === 0 && (
        <p className="empty panel">קודם הוסיפי סטודיו בהגדרות.</p>
      )}

      {loading ? (
        <p className="empty">טוען…</p>
      ) : (
        <MonthCalendar
          yearMonth={yearMonth}
          lessons={lessons}
          studios={studios}
          onLessonClick={openEdit}
          onDayClick={(date) => {
            if (studios.length === 0) return
            openCreate(date)
          }}
        />
      )}

      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <form
            className="sheet"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void onSubmit(e)}
          >
            <h2>{editingId ? 'עריכת שיעור' : 'שיעור חדש'}</h2>
            <Field label="סטודיו">
              <TextSelect
                required
                value={form.studioId}
                onChange={(e) => setForm((prev) => ({ ...prev, studioId: e.target.value }))}
              >
                {studios.map((studio) => (
                  <option key={studio.id} value={studio.id}>
                    {studio.name}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="כותרת">
              <TextInput
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </Field>
            {form.dateLocked ? (
              <p className="form-locked-date">
                תאריך: <strong>{formatShortDate(form.date)}</strong>
              </p>
            ) : (
              <Field label="תאריך">
                <TextInput
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => {
                    const date = e.target.value
                    setForm((prev) => ({
                      ...prev,
                      date,
                      untilDate:
                        prev.weekly && date && prev.startTime
                          ? defaultWeeklyUntilDate(fromLocalDateAndTime(date, prev.startTime))
                          : prev.untilDate,
                    }))
                  }}
                />
              </Field>
            )}
            <div className="time-fields">
              <Field label="התחלה">
                <TextInput
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) => {
                    const startTime = e.target.value
                    setForm((prev) => ({
                      ...prev,
                      startTime,
                      untilDate:
                        prev.weekly && prev.date && startTime
                          ? defaultWeeklyUntilDate(fromLocalDateAndTime(prev.date, startTime))
                          : prev.untilDate,
                    }))
                  }}
                />
              </Field>
              <Field label="סיום">
                <TextInput
                  type="time"
                  required
                  value={form.endTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                />
              </Field>
            </div>
            {!editingId && (
              <>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={form.weekly}
                    onChange={(e) => {
                      const weekly = e.target.checked
                      setForm((prev) => ({
                        ...prev,
                        weekly,
                        untilDate:
                          weekly && prev.date && prev.startTime
                            ? defaultWeeklyUntilDate(fromLocalDateAndTime(prev.date, prev.startTime))
                            : prev.untilDate,
                      }))
                    }}
                  />
                  <span>
                    <strong>שיעור קבוע</strong>
                    <span className="check-field__hint">כל אותו יום ושעה בשבוע</span>
                  </span>
                </label>
                {form.weekly && (
                  <Field label="עד תאריך">
                    <TextInput
                      type="date"
                      required
                      value={form.untilDate}
                      min={form.date || undefined}
                      onChange={(e) => setForm((prev) => ({ ...prev, untilDate: e.target.value }))}
                    />
                  </Field>
                )}
                {form.weekly && weeklyCount > 0 && (
                  <p className="form-hint">ייווצרו {weeklyCount} שיעורים</p>
                )}
              </>
            )}
            {error && <p className="form-error">{error}</p>}
            <div className="row-actions">
              {editingLesson && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    void removeLesson(editingLesson.id)
                    setOpen(false)
                  }}
                >
                  מחק
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                ביטול
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? 'שומר…'
                  : form.weekly && !editingId && weeklyCount > 0
                    ? `שמירת ${weeklyCount} שיעורים`
                    : 'שמירה'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
