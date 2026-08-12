import { useCallback, useEffect, useState } from 'react'
import { Button } from './Button'
import { Field, TextInput } from './Field'
import { useAuth } from '../contexts/AuthContext'
import { getRepository } from '../lib/data'
import type { SeedableDocumentCounter } from '../lib/data/types'
import { formatDocumentNumber } from '../lib/documents'

type SequenceState = {
  value: string
  min: number
  saving: boolean
  saved: boolean
  error: string
}

const emptySequence = (): SequenceState => ({
  value: '',
  min: 1,
  saving: false,
  saved: false,
  error: '',
})

export function DocumentNumberSettings() {
  const { user } = useAuth()
  const [legal, setLegal] = useState<SequenceState>(emptySequence)
  const [invoice, setInvoice] = useState<SequenceState>(emptySequence)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const counters = await getRepository().getDocumentCounters(user.uid)
      const nextLegal = counters.documentNumber + 1
      const nextInvoice = counters.invoiceNumber + 1
      setLegal({ ...emptySequence(), value: String(nextLegal), min: nextLegal })
      setInvoice({ ...emptySequence(), value: String(nextInvoice), min: nextInvoice })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveSequence = async (
    counter: SeedableDocumentCounter,
    state: SequenceState,
    setState: React.Dispatch<React.SetStateAction<SequenceState>>,
  ) => {
    if (!user) return
    const next = Number(state.value)
    if (!Number.isInteger(next) || next < state.min) {
      setState((prev) => ({
        ...prev,
        error: `יש להזין מספר שלם מ־${state.min} ומעלה`,
        saved: false,
      }))
      return
    }
    setState((prev) => ({ ...prev, saving: true, error: '', saved: false }))
    try {
      await getRepository().setNextDocumentNumber(user.uid, next, counter)
      setState((prev) => ({
        ...prev,
        saving: false,
        saved: true,
        min: next,
        value: String(next),
      }))
    } catch (err) {
      setState((prev) => ({
        ...prev,
        saving: false,
        error: err instanceof Error ? err.message : 'שמירה נכשלה',
      }))
    }
  }

  return (
    <section id="document-number" className="panel stack-sm">
      <h2>מספור מסמכים</h2>
      <p className="hint">
        לכל סוג יש מונה משלו: קבלות/ביטולים/החזרים (מספר רגיל), חשבוניות עסקה
        ({formatDocumentNumber('invoice', 1)}), ודרישות תשלום (
        {formatDocumentNumber('demand', 1)}).
      </p>
      {loading ? (
        <p className="empty">טוען…</p>
      ) : (
        <div className="stack-sm">
          <form
            className="stack-sm"
            onSubmit={(e) => {
              e.preventDefault()
              void saveSequence('documentNumber', legal, setLegal)
            }}
          >
            <Field label="מספר קבלה / ביטול / החזר הבא">
              <TextInput
                required
                inputMode="numeric"
                min={legal.min}
                step={1}
                type="number"
                value={legal.value}
                onChange={(e) => {
                  setLegal((prev) => ({
                    ...prev,
                    value: e.target.value,
                    saved: false,
                    error: '',
                  }))
                }}
              />
            </Field>
            <Button type="submit" disabled={legal.saving}>
              {legal.saving ? 'שומר…' : 'שמירת מספר קבלה'}
            </Button>
            {legal.error && <p className="empty">{legal.error}</p>}
            {legal.saved && <p className="toast">מספר הקבלה הבא נשמר</p>}
          </form>

          <form
            className="stack-sm"
            onSubmit={(e) => {
              e.preventDefault()
              void saveSequence('invoiceNumber', invoice, setInvoice)
            }}
          >
            <Field label="מספר חשבונית עסקה הבאה">
              <TextInput
                required
                inputMode="numeric"
                min={invoice.min}
                step={1}
                type="number"
                value={invoice.value}
                onChange={(e) => {
                  setInvoice((prev) => ({
                    ...prev,
                    value: e.target.value,
                    saved: false,
                    error: '',
                  }))
                }}
              />
            </Field>
            <Button type="submit" disabled={invoice.saving}>
              {invoice.saving ? 'שומר…' : 'שמירת מספר חשבונית'}
            </Button>
            {invoice.error && <p className="empty">{invoice.error}</p>}
            {invoice.saved && <p className="toast">מספר החשבונית הבאה נשמר</p>}
          </form>
        </div>
      )}
    </section>
  )
}
