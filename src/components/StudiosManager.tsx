import { useState } from 'react'
import { Button } from './Button'
import { IconButton } from './IconButton'
import { Field, TextInput } from './Field'
import { Overlay } from './Overlay'
import { ConfirmSheet, type ConfirmRequest } from './ConfirmSheet'
import { useStudios } from '../hooks/useStudios'
import { STUDIO_COLORS } from '../lib/data/types'
import { formatILS } from '../lib/money/calculations'
import type { Studio } from '../types'

export function StudiosManager() {
  const { studios, loading, saveStudio, removeStudio } = useStudios()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Studio | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [hourlyRate, setHourlyRate] = useState('150')
  const [color, setColor] = useState(STUDIO_COLORS[0])
  const [travelEnabled, setTravelEnabled] = useState(false)
  const [travelPay, setTravelPay] = useState('')
  const [swapEnabled, setSwapEnabled] = useState(false)
  const [swapPay, setSwapPay] = useState('')
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const confirmRemove = (studio: Studio) =>
    setConfirm({
      title: `למחוק את "${studio.name}"?`,
      message: 'הסטודיו יוסר לצמיתות. שיעורים ושעות שכבר תועדו יישמרו אך יאבדו את השיוך לסטודיו.',
      confirmLabel: 'מחקי סטודיו',
      onConfirm: () => void removeStudio(studio.id),
    })

  const openCreate = () => {
    setEditing(null)
    setName('')
    setPhone('')
    setEmail('')
    setHourlyRate('150')
    setColor(STUDIO_COLORS[studios.length % STUDIO_COLORS.length])
    setTravelEnabled(false)
    setTravelPay('')
    setSwapEnabled(false)
    setSwapPay('')
    setOpen(true)
  }

  const openEdit = (studio: Studio) => {
    setEditing(studio)
    setName(studio.name)
    setPhone(studio.phone ?? '')
    setEmail(studio.email ?? '')
    setHourlyRate(String(studio.hourlyRate))
    setColor(studio.color)
    const hasTravel = (studio.travelPay ?? 0) > 0
    setTravelEnabled(hasTravel)
    setTravelPay(hasTravel ? String(studio.travelPay) : '')
    const hasSwap = (studio.swapPay ?? 0) > 0
    setSwapEnabled(hasSwap)
    setSwapPay(hasSwap ? String(studio.swapPay) : '')
    setOpen(true)
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const rate = Number(hourlyRate)
    if (!name.trim() || !rate || rate <= 0) return
    const travelValue = travelEnabled ? Number(travelPay) : 0
    if (travelEnabled && (!travelValue || travelValue <= 0)) return
    const swapValue = swapEnabled ? Number(swapPay) : 0
    if (swapEnabled && (!swapValue || swapValue <= 0)) return
    await saveStudio({
      id: editing?.id,
      name,
      hourlyRate: rate,
      color,
      travelPay: travelEnabled ? travelValue : 0,
      swapPay: swapEnabled ? swapValue : 0,
      phone,
      email,
    })
    setOpen(false)
  }

  return (
    <section id="studios" className="panel stack-sm">
      <div className="panel__head">
        <h2>ניהול סטודיוים</h2>
        <Button onClick={openCreate}>סטודיו חדש</Button>
      </div>
      <p className="hint">שם, תעריף שעתי וצבע לזיהוי ביומן החודשי.</p>

      {loading ? (
        <p className="empty">טוען…</p>
      ) : studios.length === 0 ? (
        <p className="empty">עדיין אין סטודיוים. הוסיפי את הראשון.</p>
      ) : (
        <ul className="list">
          {studios.map((studio) => (
            <li key={studio.id} className="list-item list-item--action">
              <div className="list-item__main">
                <span className="color-dot" style={{ background: studio.color }} />
                <span className="list-item__body">
                  <p className="list-item__title">{studio.name}</p>
                  <p className="list-item__meta">
                    {formatILS(studio.hourlyRate)} לשעה
                    {(studio.travelPay ?? 0) > 0
                      ? ` · נסיעה ${formatILS(studio.travelPay)} ליום`
                      : ''}
                    {(studio.swapPay ?? 0) > 0
                      ? ` · החלפה ${formatILS(studio.swapPay)} לשעה`
                      : ''}
                  </p>
                </span>
              </div>
              <div className="list-item__actions">
                <IconButton label="עריכה" icon="edit" onClick={() => openEdit(studio)} />
                <IconButton
                  label="מחק"
                  icon="trash"
                  variant="danger"
                  onClick={() => confirmRemove(studio)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <Overlay onClose={() => setOpen(false)}>
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <form
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={editing ? 'עריכת סטודיו' : 'סטודיו חדש'}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void onSubmit(e)}
          >
            <h2>{editing ? 'עריכת סטודיו' : 'סטודיו חדש'}</h2>
            <Field label="שם הסטודיו">
              <TextInput required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid-2">
              <Field label="טלפון (לשליחת מסמכים, אופציונלי)">
                <TextInput
                  type="tel"
                  placeholder="05X-XXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
              <Field label="אימייל (לשליחת מסמכים, אופציונלי)">
                <TextInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            </div>
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
            <Field label="צבע ביומן">
              <div className="color-picker" role="radiogroup" aria-label="צבע סטודיו">
                {STUDIO_COLORS.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    role="radio"
                    aria-checked={color === swatch}
                    className={`color-picker__swatch${color === swatch ? ' is-selected' : ''}`}
                    style={{ background: swatch }}
                    onClick={() => setColor(swatch)}
                    title={swatch}
                  />
                ))}
              </div>
            </Field>
            {travelEnabled ? (
              <div className="stack-sm">
                <Field label="תשלום נסיעה ליום (₪)">
                  <TextInput
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={travelPay}
                    onChange={(e) => setTravelPay(e.target.value)}
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setTravelEnabled(false)
                    setTravelPay('')
                  }}
                >
                  ללא נסיעות
                </Button>
              </div>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setTravelEnabled(true)}>
                הוסף נסיעות
              </Button>
            )}
            {swapEnabled ? (
              <div className="stack-sm">
                <Field label="תשלום החלפה לשעה (₪)">
                  <TextInput
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={swapPay}
                    onChange={(e) => setSwapPay(e.target.value)}
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSwapEnabled(false)
                    setSwapPay('')
                  }}
                >
                  ללא תשלום החלפה
                </Button>
              </div>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setSwapEnabled(true)}>
                הוסף תשלום החלפה
              </Button>
            )}
            <div className="row-actions">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                ביטול
              </Button>
              <Button type="submit">שמירה</Button>
            </div>
          </form>
        </div>
        </Overlay>
      )}

      <ConfirmSheet request={confirm} onClose={() => setConfirm(null)} />
    </section>
  )
}
