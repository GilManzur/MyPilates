import { useState } from 'react'
import { Button } from '../components/Button'
import { Field, TextInput } from '../components/Field'
import { useStudios } from '../hooks/useStudios'
import { formatILS } from '../lib/money/calculations'
import type { Studio } from '../types'

export function StudiosPage() {
  const { studios, loading, saveStudio, removeStudio } = useStudios()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Studio | null>(null)
  const [name, setName] = useState('')
  const [hourlyRate, setHourlyRate] = useState('150')

  const openCreate = () => {
    setEditing(null)
    setName('')
    setHourlyRate('150')
    setOpen(true)
  }

  const openEdit = (studio: Studio) => {
    setEditing(studio)
    setName(studio.name)
    setHourlyRate(String(studio.hourlyRate))
    setOpen(true)
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const rate = Number(hourlyRate)
    if (!name.trim() || !rate || rate <= 0) return
    await saveStudio({
      id: editing?.id,
      name,
      hourlyRate: rate,
      color: editing?.color,
    })
    setOpen(false)
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">סטודיוים</p>
          <h1>תעריפים ושכר</h1>
        </div>
        <Button onClick={openCreate}>סטודיו חדש</Button>
      </div>

      {loading ? (
        <p className="empty">טוען…</p>
      ) : studios.length === 0 ? (
        <p className="empty panel">עדיין אין סטודיוים. הוסיפי את הראשון.</p>
      ) : (
        <ul className="list panel">
          {studios.map((studio) => (
            <li key={studio.id} className="list-item list-item--action">
              <button type="button" className="list-item__button" onClick={() => openEdit(studio)}>
                <span className="color-dot" style={{ background: studio.color }} />
                <span>
                  <p className="list-item__title">{studio.name}</p>
                  <p className="list-item__meta">{formatILS(studio.hourlyRate)} לשעה</p>
                </span>
              </button>
              <Button variant="ghost" onClick={() => void removeStudio(studio.id)}>
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
            <h2>{editing ? 'עריכת סטודיו' : 'סטודיו חדש'}</h2>
            <Field label="שם הסטודיו">
              <TextInput required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="שכר שעתי (₪)">
              <TextInput
                type="number"
                min="1"
                step="1"
                required
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </Field>
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
