import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { Field, TextArea, TextInput, TextSelect } from '../components/Field'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { useStudios } from '../hooks/useStudios'
import { useLessons } from '../hooks/useLessons'
import { useHourEntries } from '../hooks/useHourEntries'
import { currentYearMonth, formatILS } from '../lib/money/calculations'
import { formatLessonTime, formatShortDate } from '../lib/dates'

export function HoursPage() {
  const [yearMonth, setYearMonth] = useState(currentYearMonth())
  const { studios } = useStudios()
  const { lessons, refresh: refreshLessons } = useLessons(yearMonth)
  const { entries, addManualHours, confirmLessonHours, removeEntry } = useHourEntries(yearMonth)
  const [studioId, setStudioId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState('1')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')

  const studioMap = useMemo(
    () => Object.fromEntries(studios.map((studio) => [studio.id, studio])),
    [studios],
  )

  const unconfirmed = lessons.filter(
    (lesson) => !lesson.hoursConfirmed && lesson.status !== 'cancelled',
  )

  const onManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const selectedStudio = studioId || studios[0]?.id
    const parsedHours = Number(hours)
    if (!selectedStudio || !parsedHours || parsedHours <= 0) return
    await addManualHours({
      studioId: selectedStudio,
      date,
      hours: parsedHours,
      note: note.trim() || undefined,
    })
    setNote('')
    setHours('1')
    setMessage('השעות נשמרו')
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
        {unconfirmed.length === 0 ? (
          <p className="empty">אין שיעורים שממתינים לאישור שעות.</p>
        ) : (
          <ul className="list">
            {unconfirmed.map((lesson) => (
              <li key={lesson.id} className="list-item">
                <span
                  className="color-dot"
                  style={{ background: studioMap[lesson.studioId]?.color ?? '#5B7C6A' }}
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
        <h2>הזנה ידנית</h2>
        <p className="hint">אם אין שיעור ביומן — הזיני כאן את השעות לפי סטודיו.</p>
        <form className="stack-sm" onSubmit={(e) => void onManualSubmit(e)}>
          <Field label="סטודיו">
            <TextSelect
              required
              value={studioId || studios[0]?.id || ''}
              onChange={(e) => setStudioId(e.target.value)}
              disabled={studios.length === 0}
            >
              {studios.map((studio) => (
                <option key={studio.id} value={studio.id}>
                  {studio.name} ({formatILS(studio.hourlyRate)}/שעה)
                </option>
              ))}
            </TextSelect>
          </Field>
          <div className="grid-2">
            <Field label="תאריך">
              <TextInput type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="שעות">
              <TextInput
                type="number"
                min="0.25"
                step="0.25"
                required
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </Field>
          </div>
          <Field label="הערה (אופציונלי)">
            <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </Field>
          <Button type="submit" disabled={studios.length === 0}>
            שמור שעות
          </Button>
        </form>
      </section>

      <section className="panel">
        <h2>רשומות החודש</h2>
        {entries.length === 0 ? (
          <p className="empty">עדיין אין שעות בחודש הזה.</p>
        ) : (
          <ul className="list">
            {entries.map((entry) => (
              <li key={entry.id} className="list-item">
                <span
                  className="color-dot"
                  style={{ background: studioMap[entry.studioId]?.color ?? '#5B7C6A' }}
                />
                <div className="list-item__body">
                  <p className="list-item__title">
                    {entry.hours} שע׳ · {studioMap[entry.studioId]?.name ?? 'סטודיו'}
                  </p>
                  <p className="list-item__meta">
                    {formatShortDate(entry.date)} · {entry.source === 'lesson' ? 'משיעור' : 'ידני'}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </p>
                </div>
                <IconButton
                  label="מחק"
                  icon="trash"
                  variant="danger"
                  onClick={() => void removeEntry(entry.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
