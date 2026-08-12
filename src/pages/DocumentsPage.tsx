import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { Icon } from '../components/Icon'
import { Field, TextArea, TextInput, TextSelect } from '../components/Field'
import { DocumentPrint } from '../components/DocumentPrint'
import { Overlay } from '../components/Overlay'
import { ConfirmSheet, type ConfirmRequest } from '../components/ConfirmSheet'
import { elementToPdfBlob, shareDocumentPdf } from '../lib/share/documentPdf'
import { useDocuments } from '../hooks/useDocuments'
import { useProfile } from '../hooks/useProfile'
import { useStudios } from '../hooks/useStudios'
import type { DocumentDraft } from '../lib/data/types'
import {
  documentTypeLabel,
  formatDocumentNumber,
  isVoidableDocumentType,
  lineItemsTotal,
  paymentMethodLabel,
  PAYMENT_BEARING_TYPES,
} from '../lib/documents'
import { formatILSExact } from '../lib/money/calculations'
import { formatShortDate } from '../lib/dates'
import type {
  DocumentLineItem,
  DocumentPayment,
  DocumentType,
  FinancialDocument,
  PaymentMethod,
} from '../types'

type ItemForm = { description: string; quantity: string; unitPrice: string }

const ISSUABLE_TYPES: DocumentType[] = ['receipt', 'invoice', 'demand']
const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'transfer', 'bit', 'paypal', 'credit', 'check']

const emptyItem = (): ItemForm => ({ description: '', quantity: '1', unitPrice: '' })

const emptyForm = {
  type: 'receipt' as DocumentType,
  recipientName: '',
  recipientTaxId: '',
  recipientAddress: '',
  recipientPhone: '',
  studioId: '',
  items: [emptyItem()],
  method: 'transfer' as PaymentMethod,
  bank: '',
  branch: '',
  accountNumber: '',
  checkNumber: '',
  dueDate: '',
  cardType: '',
  reference: '',
  note: '',
}

export function DocumentsPage() {
  const { documents, loading, issue, cancel, voidDoc } = useDocuments()
  const { business } = useProfile()
  const { studios } = useStudios()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const viewed = viewerId ? documents.find((doc) => doc.id === viewerId) ?? null : null
  const [copyMode, setCopyMode] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareNote, setShareNote] = useState('')

  // Every freshly-opened document prints as the original ("מקור") first.
  useEffect(() => {
    setCopyMode(false)
    setShareNote('')
  }, [viewerId])

  const printWith = (copy: boolean) => {
    setCopyMode(copy)
    // Let React paint the correct מקור/העתק label before the print dialog opens.
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
  }

  const onShareWhatsApp = async () => {
    const node = document
      .getElementById('print-root')
      ?.querySelector('.doc-print') as HTMLElement | null
    if (!node || !viewed) return
    setSharing(true)
    setShareNote('')
    // Force the full page-width layout so the receipt is never clipped in the PDF.
    node.classList.add('doc-print--capture')
    try {
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      )
      const blob = await elementToPdfBlob(node)
      const number = formatDocumentNumber(viewed.type, viewed.number)
      const label = documentTypeLabel(viewed.type)
      const outcome = await shareDocumentPdf({
        blob,
        fileName: `${label}-${number}.pdf`,
        title: `${label} ${number}`,
        text: `${label} מס׳ ${number} מאת ${viewed.business.legalName} · סה״כ ${formatILSExact(viewed.total)}`,
        phone: viewed.recipient.phone,
      })
      if (outcome === 'fallback') {
        setShareNote('הדפדפן לא תומך בשיתוף קבצים — הקובץ ירד למכשיר ונפתחה שיחת וואטסאפ.')
      }
    } catch {
      setShareNote('אירעה שגיאה בהכנת הקובץ. נסי שוב.')
    } finally {
      node.classList.remove('doc-print--capture')
      setSharing(false)
    }
  }

  const computedItems = useMemo<DocumentLineItem[]>(
    () =>
      form.items
        .filter((item) => item.description.trim())
        .map((item) => {
          const quantity = Number(item.quantity) || 0
          const unitPrice = Number(item.unitPrice) || 0
          return {
            description: item.description.trim(),
            quantity,
            unitPrice,
            amount: Math.round(quantity * unitPrice * 100) / 100,
          }
        }),
    [form.items],
  )
  const total = lineItemsTotal(computedItems)
  const carriesPayment = PAYMENT_BEARING_TYPES.includes(form.type)

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const updateItem = (index: number, patch: Partial<ItemForm>) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))

  const openNew = () => {
    setForm(emptyForm)
    setError('')
    setOpen(true)
  }

  const buildPayment = (): DocumentPayment => {
    const payment: DocumentPayment = { method: form.method, amount: total }
    if (form.method === 'check') {
      if (form.bank.trim()) payment.bank = form.bank.trim()
      if (form.branch.trim()) payment.branch = form.branch.trim()
      if (form.accountNumber.trim()) payment.accountNumber = form.accountNumber.trim()
      if (form.checkNumber.trim()) payment.checkNumber = form.checkNumber.trim()
      if (form.dueDate) payment.dueDate = form.dueDate
    } else if (form.method === 'credit') {
      if (form.cardType.trim()) payment.cardType = form.cardType.trim()
    } else if (form.reference.trim()) {
      payment.reference = form.reference.trim()
    }
    return payment
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!business) {
      setError('קודם מלאי את פרטי העסק בהגדרות')
      return
    }
    if (!form.recipientName.trim()) {
      setError('הזיני שם לקוח / משלם')
      return
    }
    if (computedItems.length === 0 || total <= 0) {
      setError('הוסיפי לפחות שורה אחת עם תיאור וסכום')
      return
    }
    const recipient: FinancialDocument['recipient'] = { name: form.recipientName.trim() }
    if (form.recipientTaxId.trim()) recipient.taxId = form.recipientTaxId.trim()
    if (form.recipientAddress.trim()) recipient.address = form.recipientAddress.trim()
    if (form.recipientPhone.trim()) recipient.phone = form.recipientPhone.trim()
    if (form.studioId) recipient.studioId = form.studioId

    const draft: DocumentDraft = {
      type: form.type,
      issuedAt: new Date().toISOString(),
      recipient,
      lineItems: computedItems,
      total,
      currency: 'ILS',
      business,
      ...(carriesPayment ? { payments: [buildPayment()] } : {}),
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
    }

    setSaving(true)
    try {
      const created = await issue(draft)
      setOpen(false)
      if (created) setViewerId(created.id)
    } finally {
      setSaving(false)
    }
  }

  const onCancelDocument = (doc: FinancialDocument) => {
    if (!business || doc.type !== 'receipt') return
    const formatted = formatDocumentNumber(doc.type, doc.number)
    setConfirm({
      title: `לבטל ${documentTypeLabel(doc.type)} מס׳ ${formatted}?`,
      message: 'תופק תעודת ביטול והמסמך המקורי יסומן כמבוטל. פעולה זו אינה הפיכה.',
      confirmLabel: 'בטלי מסמך',
      onConfirm: () => {
        void (async () => {
          const draft: DocumentDraft = {
            type: 'cancellation',
            issuedAt: new Date().toISOString(),
            recipient: doc.recipient,
            lineItems: doc.lineItems.map((item) => ({
              ...item,
              unitPrice: -item.unitPrice,
              amount: -item.amount,
            })),
            total: -doc.total,
            currency: 'ILS',
            relatedNumber: doc.number,
            relatedType: doc.type,
            business,
            note: `ביטול ${documentTypeLabel(doc.type)} מס׳ ${formatted}`,
          }
          const created = await cancel(doc.id, draft)
          if (created) setViewerId(created.id)
        })()
      },
    })
  }

  const onVoidDocument = (doc: FinancialDocument) => {
    if (!isVoidableDocumentType(doc.type) || doc.status !== 'issued') return
    const formatted = formatDocumentNumber(doc.type, doc.number)
    setConfirm({
      title: `לבטל ${documentTypeLabel(doc.type)} מס׳ ${formatted}?`,
      message: 'המסמך יסומן כמבוטל ויישמר לצמיתות (לא יימחק). פעולה זו אינה הפיכה.',
      confirmLabel: 'בטלי מסמך',
      onConfirm: () => {
        void (async () => {
          await voidDoc(doc.id)
        })()
      },
    })
  }

  const onRefundDocument = (doc: FinancialDocument) => {
    if (!business) return
    const formatted = formatDocumentNumber(doc.type, doc.number)
    setConfirm({
      title: `להפיק קבלה על החזר כספי בגין מס׳ ${formatted}?`,
      message: 'תופק קבלה חדשה על החזר כספי המפנה לקבלה המקורית.',
      confirmLabel: 'הפיקי החזר',
      danger: false,
      onConfirm: () => {
        void (async () => {
          const draft: DocumentDraft = {
            type: 'refund',
            issuedAt: new Date().toISOString(),
            recipient: doc.recipient,
            lineItems: doc.lineItems,
            total: doc.total,
            currency: 'ILS',
            relatedNumber: doc.number,
            relatedType: doc.type,
            payments: [{ method: 'transfer', amount: doc.total }],
            business,
            note: `החזר כספי בגין קבלה מס׳ ${formatted}`,
          }
          const created = await cancel(doc.id, draft)
          if (created) setViewerId(created.id)
        })()
      },
    })
  }

  return (
    <div className="stack app-desk-docs">
      <div className="page-head">
        <div>
          <p className="eyebrow">מסמכים</p>
          <h1>קבלות ומסמכים</h1>
        </div>
        <Button onClick={openNew} disabled={!business}>
          מסמך חדש
        </Button>
      </div>

      {!business && (
        <p className="empty panel">
          כדי להפיק מסמכים חוקיים, קודם מלאי את <Link to="/settings#business">פרטי העסק</Link>{' '}
          בהגדרות.
        </p>
      )}

      <section className="panel">
        <h2>מסמכים שהופקו</h2>
        {loading ? (
          <p className="empty">טוען…</p>
        ) : documents.length === 0 ? (
          <p className="empty">עדיין לא הופקו מסמכים.</p>
        ) : (
          <ul className="list">
            {documents.map((doc) => {
              const canCancel = doc.status === 'issued' && doc.type === 'receipt'
              const canRefund = doc.status === 'issued' && doc.type === 'receipt'
              const canVoid = isVoidableDocumentType(doc.type) && doc.status === 'issued'
              return (
                <li key={doc.id} className="list-item list-item--action">
                  <div className="list-item__main">
                    <span className="list-item__body">
                      <p className="list-item__title">
                        {documentTypeLabel(doc.type)} · מס׳{' '}
                        {formatDocumentNumber(doc.type, doc.number)}
                      </p>
                      <p className="list-item__meta">
                        {doc.recipient.name} · {formatShortDate(doc.issuedAt)} ·{' '}
                        {formatILSExact(doc.total)}
                        {doc.status === 'cancelled' ? ' · מבוטל' : ''}
                      </p>
                    </span>
                  </div>
                  <div className="list-item__actions">
                    <IconButton
                      label="צפייה והדפסה"
                      icon="print"
                      onClick={() => setViewerId(doc.id)}
                    />
                    {canRefund && (
                      <IconButton
                        label="החזר כספי"
                        icon="refund"
                        onClick={() => void onRefundDocument(doc)}
                      />
                    )}
                    {canCancel && (
                      <IconButton
                        label="ביטול"
                        icon="cancel"
                        variant="danger"
                        onClick={() => void onCancelDocument(doc)}
                      />
                    )}
                    {canVoid && (
                      <IconButton
                        label="ביטול מסמך"
                        icon="cancel"
                        variant="danger"
                        onClick={() => void onVoidDocument(doc)}
                      />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {open && (
        <Overlay onClose={() => setOpen(false)}>
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <form
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="מסמך חדש"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void onSubmit(e)}
          >
            <h2>מסמך חדש</h2>
            <Field label="סוג מסמך">
              <TextSelect
                value={form.type}
                onChange={(e) => setField('type', e.target.value as DocumentType)}
              >
                {ISSUABLE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {documentTypeLabel(type)}
                  </option>
                ))}
              </TextSelect>
            </Field>

            {studios.length > 0 && (
              <Field label="קישור לסטודיו (אופציונלי)">
                <TextSelect
                  value={form.studioId}
                  onChange={(e) => {
                    const studioId = e.target.value
                    const studio = studios.find((s) => s.id === studioId)
                    setForm((prev) => ({
                      ...prev,
                      studioId,
                      recipientName: studio ? studio.name : prev.recipientName,
                    }))
                  }}
                >
                  <option value="">— ללא —</option>
                  {studios.map((studio) => (
                    <option key={studio.id} value={studio.id}>
                      {studio.name}
                    </option>
                  ))}
                </TextSelect>
              </Field>
            )}

            <Field label="שם הלקוח / המשלם">
              <TextInput
                required
                value={form.recipientName}
                onChange={(e) => setField('recipientName', e.target.value)}
              />
            </Field>
            <div className="grid-2">
              <Field label="ת״ז / עוסק (אופציונלי)">
                <TextInput
                  value={form.recipientTaxId}
                  onChange={(e) => setField('recipientTaxId', e.target.value)}
                />
              </Field>
              <Field label="כתובת (אופציונלי)">
                <TextInput
                  value={form.recipientAddress}
                  onChange={(e) => setField('recipientAddress', e.target.value)}
                />
              </Field>
            </div>
            <Field label="טלפון (לשליחת הקבלה בוואטסאפ, אופציונלי)">
              <TextInput
                type="tel"
                inputMode="tel"
                placeholder="05X-XXXXXXX"
                value={form.recipientPhone}
                onChange={(e) => setField('recipientPhone', e.target.value)}
              />
            </Field>

            <p className="field__label">שורות</p>
            {form.items.map((item, index) => (
              <div key={index} className="doc-item-row">
                <Field label="תיאור">
                  <TextInput
                    value={item.description}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                  />
                </Field>
                <div className="grid-2">
                  <Field label="כמות">
                    <TextInput
                      type="number"
                      min="0"
                      step="0.25"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: e.target.value })}
                    />
                  </Field>
                  <Field label="מחיר יחידה">
                    <TextInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                    />
                  </Field>
                </div>
                {form.items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        items: prev.items.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    הסרת שורה
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }))}
            >
              הוספת שורה
            </Button>

            {carriesPayment && (
              <>
                <Field label="אמצעי תשלום">
                  <TextSelect
                    value={form.method}
                    onChange={(e) => setField('method', e.target.value as PaymentMethod)}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {paymentMethodLabel(method)}
                      </option>
                    ))}
                  </TextSelect>
                </Field>
                {form.method === 'check' ? (
                  <div className="grid-2">
                    <Field label="בנק">
                      <TextInput value={form.bank} onChange={(e) => setField('bank', e.target.value)} />
                    </Field>
                    <Field label="סניף">
                      <TextInput
                        value={form.branch}
                        onChange={(e) => setField('branch', e.target.value)}
                      />
                    </Field>
                    <Field label="מס׳ חשבון">
                      <TextInput
                        value={form.accountNumber}
                        onChange={(e) => setField('accountNumber', e.target.value)}
                      />
                    </Field>
                    <Field label="מס׳ המחאה">
                      <TextInput
                        value={form.checkNumber}
                        onChange={(e) => setField('checkNumber', e.target.value)}
                      />
                    </Field>
                    <Field label="תאריך פירעון">
                      <TextInput
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => setField('dueDate', e.target.value)}
                      />
                    </Field>
                  </div>
                ) : form.method === 'credit' ? (
                  <Field label="סוג כרטיס">
                    <TextInput
                      value={form.cardType}
                      onChange={(e) => setField('cardType', e.target.value)}
                    />
                  </Field>
                ) : (
                  <Field label="אסמכתא (אופציונלי)">
                    <TextInput
                      value={form.reference}
                      onChange={(e) => setField('reference', e.target.value)}
                    />
                  </Field>
                )}
              </>
            )}

            <Field label="הערה (אופציונלי)">
              <TextArea rows={2} value={form.note} onChange={(e) => setField('note', e.target.value)} />
            </Field>

            <p className="form-hint">סה״כ: {formatILSExact(total)}</p>
            {error && <p className="form-error">{error}</p>}
            <div className="row-actions">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                ביטול
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'מפיק…' : 'הפקה'}
              </Button>
            </div>
          </form>
        </div>
        </Overlay>
      )}

      {viewed && (
        <Overlay onClose={() => setViewerId(null)}>
        <div
          className="doc-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="תצוגת מסמך"
          onClick={() => setViewerId(null)}
        >
          <div className="doc-viewer__bar" onClick={(e) => e.stopPropagation()}>
            <Button variant="secondary" onClick={() => setViewerId(null)}>
              סגירה
            </Button>
            <Button variant="secondary" onClick={() => printWith(true)}>
              הדפסת עותק
            </Button>
            <Button onClick={() => printWith(false)}>הדפסה / שמירה כ‑PDF</Button>
            <Button
              className="btn--whatsapp"
              onClick={() => void onShareWhatsApp()}
              disabled={sharing}
            >
              <Icon name="whatsapp" />
              {sharing ? 'מכין…' : 'שליחה בוואטסאפ'}
            </Button>
          </div>
          {shareNote && (
            <p className="doc-viewer__note" onClick={(e) => e.stopPropagation()}>
              {shareNote}
            </p>
          )}
          <div id="print-root" onClick={(e) => e.stopPropagation()}>
            <DocumentPrint
              document={viewed}
              copyLabel={copyMode ? 'העתק — נאמן למקור' : 'מקור'}
            />
          </div>
        </div>
        </Overlay>
      )}

      <ConfirmSheet request={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
