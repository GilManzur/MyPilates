import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { Field, TextInput, TextSelect } from '../components/Field'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { useStudios } from '../hooks/useStudios'
import { useLessons } from '../hooks/useLessons'
import { currentYearMonth } from '../lib/money/calculations'
import { formatLessonTime, fromLocalInputValue, toLocalInputValue } from '../lib/dates'
import type { Lesson } from '../types'

const emptyForm = {
  studioId: '',
  title: '',
  startAt: '',
  endAt: '',
}

export function CalendarPage() {
  const [yearMonth, setYearMonth] = useState(currentYearMonth())
  const { studios } = useStudios()
  const { lessons, loading, saveLesson, removeLesson } = useLessons(yearMonth)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const studioMap = useMemo(
    () => Object.fromEntries(studios.map((studio) => [studio.id, studio])),
    [studios],
  )

  const openCreate = () => {
    const start = new Date()
    start.setMinutes(0, 0, 0)
    start.setHours(start.getHours() + 1)
    const end = new Date(start)
    end.setHours(end.getHours() + 1)
    setEditingId(null)
    setForm({
      studioId: studios[0]?.id ?? '',
      title: 'שיעור פילאטיס',
      startAt: toLocalInputValue(start.toISOString()),
      endAt: toLocalInputValue(end.toISOString()),
    })
    setOpen(true)
  }

  const openEdit = (lesson: Lesson) => {
    setEditingId(lesson.id)
    setForm({
      studioId: lesson.studioId,
      title: lesson.title,
      startAt: toLocalInputValue(lesson.startAt),
      endAt: toLocalInputValue(lesson.endAt),
    })
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
    await saveLesson({
      id: editingId ?? undefined,
      studioId: form.studioId,
      title: form.title,
      startAt,
      endAt,
    })
    setOpen(false)
    setForm(emptyForm)
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">יומן חודשי</p>
          <h1>שיעורים</h1>
        </div>
        <Button onClick={openCreate} disabled={studios.length === 0}>
          שיעור חדש
        </Button>
      </div>

      <MonthSwitcher yearMonth={yearMonth} onChange={setYearMonth} />

      {studios.length === 0 && (
        <p className="empty panel">קודם הוסיפי סטודיו בהגדרות.</p>
      )}

      {loading ? (
        <p className="empty">טוען…</p>
      ) : lessons.length === 0 ? (
        <p className="empty panel">אין שיעורים בחודש הזה.</p>
      ) : (
        <ul className="list panel">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="list-item list-item--action">
              <button type="button" className="list-item__button" onClick={() => openEdit(lesson)}>
                <span
                  className="color-dot"
                  style={{ background: studioMap[lesson.studioId]?.color ?? '#5B7C6A' }}
                />
                <span>
                  <p className="list-item__title">{lesson.title}</p>
                  <p className="list-item__meta">
                    {studioMap[lesson.studioId]?.name ?? 'סטודיו'} ·{' '}
                    {formatLessonTime(lesson.startAt)} · {lesson.durationHours} שע׳
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
                onChange={(e) => setForm((prev) => ({ ...prev, startAt: e.target.value }))}
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
            {error && <p className="form-error">{error}</p>}
            <div className="row-actions">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                ביטול
              </Button>
              <Button type="submit">שמירה</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
