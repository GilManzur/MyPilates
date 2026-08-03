import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Field, TextInput, TextSelect } from '../components/Field'
import { MonthCalendar } from '../components/MonthCalendar'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { useStudios } from '../hooks/useStudios'
import { useLessons } from '../hooks/useLessons'
import { currentYearMonth } from '../lib/money/calculations'
import { formatLessonTime, fromLocalInputValue, toLocalInputValue } from '../lib/dates'
import { buildWeeklyOccurrences, defaultWeeklyUntilDate } from '../lib/recurrence'
import type { Lesson } from '../types'

const emptyForm = {
  studioId: '',
  title: '',
  startAt: '',
  endAt: '',
  weekly: false,
  untilDate: '',
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

  const studioMap = useMemo(
    () => Object.fromEntries(studios.map((studio) => [studio.id, studio])),
    [studios],
  )

  const weeklyCount = useMemo(() => {
    if (!form.weekly || !form.startAt || !form.endAt || !form.untilDate) return 0
    const startAt = fromLocalInputValue(form.startAt)
    const endAt = fromLocalInputValue(form.endAt)
    if (new Date(endAt) <= new Date(startAt)) return 0
    return buildWeeklyOccurrences(startAt, endAt, form.untilDate).length
  }, [form.weekly, form.startAt, form.endAt, form.untilDate])

  const openCreate = (date?: string) => {
    const start = date ? new Date(`${date}T10:00:00`) : new Date()
    if (!date) {
      start.setMinutes(0, 0, 0)
      start.setHours(start.getHours() + 1)
    }
    const end = new Date(start)
    end.setHours(end.getHours() + 1)
    const startIso = start.toISOString()
    setEditingId(null)
    setForm({
      studioId: studios[0]?.id ?? '',
      title: 'שיעור פילאטיס',
      startAt: toLocalInputValue(startIso),
      endAt: toLocalInputValue(end.toISOString()),
      weekly: false,
      untilDate: defaultWeeklyUntilDate(startIso),
    })
    setError('')
    setOpen(true)
  }

  const openEdit = (lesson: Lesson) => {
    setEditingId(lesson.id)
    setForm({
      studioId: lesson.studioId,
      title: lesson.title,
      startAt: toLocalInputValue(lesson.startAt),
      endAt: toLocalInputValue(lesson.endAt),
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
    const startAt = fromLocalInputValue(form.startAt)
    const endAt = fromLocalInputValue(form.endAt)
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

      {!loading && lessons.length > 0 && (
        <section className="panel">
          <div className="panel__head">
            <h2>רשימת החודש</h2>
          </div>
          <ul className="list">
            {lessons.map((lesson) => (
              <li key={lesson.id} className="list-item list-item--action">
                <button type="button" className="list-item__button" onClick={() => openEdit(lesson)}>
                  <span
                    className="color-dot"
                    style={{ background: studioMap[lesson.studioId]?.color ?? '#5B7C6A' }}
                  />
                  <span className="list-item__body">
                    <p className="list-item__title">{lesson.title}</p>
                    <p className="list-item__meta">
                      {studioMap[lesson.studioId]?.name ?? 'סטודיו'} ·{' '}
                      {formatLessonTime(lesson.startAt)} · {lesson.durationHours} שע׳
                      {lesson.seriesId ? ' · קבוע' : ''}
                    </p>
                  </span>
                  <span className={`badge badge--${lesson.hoursConfirmed ? 'confirmed' : 'pending'}`}>
                    {lesson.hoursConfirmed ? 'אושר' : lesson.status === 'cancelled' ? 'בוטל' : 'מתוכנן'}
                  </span>
                </button>
                <Button variant="ghost" onClick={() => void removeLesson(lesson.id)}>
                  מחק
                </Button>
              </li>
            ))}
          </ul>
        </section>
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
            <Field label="התחלה">
              <TextInput
                type="datetime-local"
                required
                value={form.startAt}
                onChange={(e) => {
                  const value = e.target.value
                  setForm((prev) => ({
                    ...prev,
                    startAt: value,
                    untilDate:
                      prev.weekly && value
                        ? defaultWeeklyUntilDate(fromLocalInputValue(value))
                        : prev.untilDate,
                  }))
                }}
              />
            </Field>
            <Field label="סיום">
              <TextInput
                type="datetime-local"
                required
                value={form.endAt}
                onChange={(e) => setForm((prev) => ({ ...prev, endAt: e.target.value }))}
              />
            </Field>
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
                          weekly && prev.startAt
                            ? defaultWeeklyUntilDate(fromLocalInputValue(prev.startAt))
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
                      min={form.startAt.slice(0, 10)}
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
