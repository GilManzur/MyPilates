import { useCallback, useEffect, useState } from 'react'
import { Button } from './Button'
import { Field, TextInput } from './Field'
import { useAuth } from '../contexts/AuthContext'
import { getRepository } from '../lib/data'
import { formatDocumentNumber } from '../lib/documents'

export function DocumentNumberSettings() {
  const { user } = useAuth()
  const [nextNumber, setNextNumber] = useState('')
  const [minNext, setMinNext] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const counters = await getRepository().getDocumentCounters(user.uid)
      const next = counters.documentNumber + 1
      setMinNext(next)
      setNextNumber(String(next))
      setError('')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return
    const next = Number(nextNumber)
    if (!Number.isInteger(next) || next < minNext) {
      setError(`יש להזין מספר שלם מ־${minNext} ומעלה`)
      return
    }
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      await getRepository().setNextDocumentNumber(user.uid, next)
      setMinNext(next)
      setNextNumber(String(next))
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section id="document-number" className="panel stack-sm">
      <h2>מספור מסמכים</h2>
      <p className="hint">
        מספר המסמך הבא חל על קבלות, חשבוניות עסקה, ביטולים והחזרים. דרישות תשלום ממוספרות בנפרד
        כ־{formatDocumentNumber('demand', 1)}.
      </p>
      {loading ? (
        <p className="empty">טוען…</p>
      ) : (
        <form className="stack-sm" onSubmit={(e) => void onSubmit(e)}>
          <Field label="מספר מסמך הבא">
            <TextInput
              required
              inputMode="numeric"
              min={minNext}
              step={1}
              type="number"
              value={nextNumber}
              onChange={(e) => {
                setNextNumber(e.target.value)
                setSaved(false)
                setError('')
              }}
            />
          </Field>
          <Button type="submit" disabled={saving}>
            {saving ? 'שומר…' : 'שמירת מספר מסמך'}
          </Button>
          {error && <p className="empty">{error}</p>}
          {saved && <p className="toast">מספר המסמך הבא נשמר</p>}
        </form>
      )}
    </section>
  )
}
