import { useEffect, useState } from 'react'
import { Button } from './Button'
import { Field, TextInput } from './Field'
import { useProfile } from '../hooks/useProfile'
import type { BusinessProfile } from '../types'

export function BusinessDetails() {
  const { business, loading, saveBusiness } = useProfile()
  const [legalName, setLegalName] = useState('')
  const [ownerFullName, setOwnerFullName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!business) return
    setLegalName(business.legalName)
    setOwnerFullName(business.ownerFullName ?? '')
    setTaxId(business.taxId)
    setAddress(business.address ?? '')
    setPhone(business.phone ?? '')
    setEmail(business.email ?? '')
  }, [business])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!legalName.trim() || !taxId.trim()) return
    // Only include optional fields when present — Firestore rejects `undefined`.
    const next: BusinessProfile = { legalName: legalName.trim(), taxId: taxId.trim() }
    if (ownerFullName.trim()) next.ownerFullName = ownerFullName.trim()
    if (address.trim()) next.address = address.trim()
    if (phone.trim()) next.phone = phone.trim()
    if (email.trim()) next.email = email.trim()
    setSaving(true)
    try {
      await saveBusiness(next)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section id="business" className="panel stack-sm">
      <h2>פרטי העסק</h2>
      <p className="hint">
        הפרטים מופיעים על כל קבלה, חשבונית עסקה ודרישת תשלום שתפיקי. חובה למלא שם ומספר עוסק פטור /
        ת״ז לפני הפקת מסמכים.
      </p>
      {loading ? (
        <p className="empty">טוען…</p>
      ) : (
        <form className="stack-sm" onSubmit={(e) => void onSubmit(e)}>
          <Field label="שם העסק / שם מלא">
            <TextInput
              required
              value={legalName}
              onChange={(e) => {
                setLegalName(e.target.value)
                setSaved(false)
              }}
            />
          </Field>
          <Field label="מספר עוסק פטור / ת״ז">
            <TextInput
              required
              inputMode="numeric"
              value={taxId}
              onChange={(e) => {
                setTaxId(e.target.value)
                setSaved(false)
              }}
            />
          </Field>
          <Field label="שם מלא (יופיע בשם הקובץ שנשלח/יורד, אופציונלי)">
            <TextInput
              value={ownerFullName}
              onChange={(e) => {
                setOwnerFullName(e.target.value)
                setSaved(false)
              }}
            />
          </Field>
          <Field label="כתובת (אופציונלי)">
            <TextInput value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <div className="grid-2">
            <Field label="טלפון (אופציונלי)">
              <TextInput
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label="אימייל (אופציונלי)">
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'שומר…' : 'שמירת פרטי עסק'}
          </Button>
          {saved && <p className="toast">פרטי העסק נשמרו</p>}
        </form>
      )}
    </section>
  )
}
