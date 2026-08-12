import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { Icon } from '../components/Icon'
import { Field, TextArea, TextInput, TextSelect } from '../components/Field'
import { DocumentPrint } from '../components/DocumentPrint'
import { DocumentLedger } from '../components/DocumentLedger'
import { SequenceCheck } from '../components/SequenceCheck'
import { Overlay } from '../components/Overlay'
import { ConfirmSheet, type ConfirmRequest } from '../components/ConfirmSheet'
import {
  archiveReceiptPdf,
  elementToPdfBlob,
  shareDocumentPdf,
  type ShareChannel,
} from '../lib/share/documentPdf'
import { useDocuments } from '../hooks/useDocuments'
import { useAuth } from '../contexts/AuthContext'
import { getRepository } from '../lib/data'
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
import { formatILSExact, currentYearMonth } from '../lib/money/calculations'
import { formatShortDate, formatMonthTitle } from '../lib/dates'
import type {
  DocumentLineItem,
  DocumentPayment,
  DocumentType,
  FinancialDocument,
  Lesson,
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
  recipientConsent: true,
}

export function DocumentsPage() {
  const { documents, counters, loading, issue, cancel, voidDoc } = useDocuments()
  const { user } = useAuth()
  const { business } = useProfile()
  const { studios } = useStudios()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [showSequence, setShowSequence] = useState(false)
  const [ledgerMonth, setLedgerMonth] = useState<string | null>(null)
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null)
  // Lazily-loaded performed lessons per expanded document ('loading' while fetching).
  const [lessonsByDoc, setLessonsByDoc] = useState<Record<string, Lesson[] | 'loading'>>({})
  // Document ids whose lessons we've already started fetching (dedupe, no re-fetch).
  const fetchedLessonsRef = useRef<Set<string>>(new Set())
  const [preview, setPreview] = useState(false)
  // True only while rasterizing for WhatsApp/PDF, so the delivered copy is
  // stamped "מסמך ממוחשב" (חוזר 24/2004) while the paper print is not.
  const [markComputerized, setMarkComputerized] = useState(false)
  // A freshly-issued receipt awaiting its automatic Drive/Sheets backup.
  const [archivePendingId, setArchivePendingId] = useState<string | null>(null)

  const viewed = viewerId ? documents.find((doc) => doc.id === viewerId) ?? null : null
  const [copyMode, setCopyMode] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareNote, setShareNote] = useState('')

  const openViewer = (id: string) => {
    // Viewing/printing shows the original ("מקור"); only sent copies are "העתק".
    setCopyMode(false)
    setShareNote('')
    setViewerId(id)
  }

  /** File name base (no extension): `קבלה 0001 - שם מלא`. Uses the current
   * profile's full name (set in settings), falling back to the business name. */
  const docFileBase = useCallback(
    (doc: FinancialDocument) => {
      const name = business?.ownerFullName?.trim() || business?.legalName || doc.business.legalName
      return `${documentTypeLabel(doc.type)} ${formatDocumentNumber(doc.type, doc.number)} - ${name}`
    },
    [business],
  )

  // Print / save as PDF — always the original ("מקור"). Names the saved file via
  // document.title (the browser's default "Save as PDF" file name).
  const onPrint = () => {
    if (!viewed) return
    setCopyMode(false)
    const previousTitle = document.title
    document.title = docFileBase(viewed)
    const restore = () => {
      document.title = previousTitle
      window.removeEventListener('afterprint', restore)
    }
    window.addEventListener('afterprint', restore)
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
  }

  // Back up a freshly-issued receipt to Drive/Sheets once its viewer has painted.
  useEffect(() => {
    if (!archivePendingId || viewerId !== archivePendingId) return
    // Skip all work (including rasterization) when archiving is not configured.
    if (!import.meta.env.VITE_ARCHIVE_WEBAPP_URL) {
      setArchivePendingId(null)
      return
    }
    const id = archivePendingId
    const target = documents.find((d) => d.id === id)
    if (!target) return
    let cancelled = false
    void (async () => {
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      )
      if (cancelled) return
      const node = document
        .getElementById('print-root')
        ?.querySelector('.doc-print') as HTMLElement | null
      if (node) {
        try {
          const blob = await elementToPdfBlob(node)
          const number = formatDocumentNumber(target.type, target.number)
          await archiveReceiptPdf(blob, {
            fileName: `${docFileBase(target)}.pdf`,
            yearMonth: target.issuedAt.slice(0, 7),
            number,
            type: target.type,
            issuedAt: target.issuedAt,
            recipientName: target.recipient.name,
            total: target.total,
          })
        } catch {
          // Backup is best-effort; never block or alert the user.
        }
      }
      if (!cancelled) setArchivePendingId((cur) => (cur === id ? null : cur))
    })()
    return () => {
      cancelled = true
    }
  }, [archivePendingId, viewerId, documents, docFileBase])

  // Load the performed lessons behind an expanded studio-month document.
  // Note: `lessonsByDoc` is deliberately NOT a dependency — including it made
  // the "loading" state-update re-run the effect and cancel the in-flight fetch
  // (worked with the synchronous local repo, hung on async Firestore). We dedupe
  // with a ref and always resolve the state.
  useEffect(() => {
    if (!expandedDocId || !user) return
    const docId = expandedDocId
    const target = documents.find((d) => d.id === docId)
    const source = target?.sourceRef
    if (!source || fetchedLessonsRef.current.has(docId)) return
    fetchedLessonsRef.current.add(docId)
    setLessonsByDoc((m) => ({ ...m, [docId]: 'loading' }))
    getRepository()
      .listLessons(user.uid, source.yearMonth)
      .then((list) => {
        const performed = list.filter(
          (l) => l.studioId === source.studioId && l.status !== 'cancelled',
        )
        setLessonsByDoc((m) => ({ ...m, [docId]: performed }))
      })
      .catch(() => {
        // Allow a retry on a later expand.
        fetchedLessonsRef.current.delete(docId)
        setLessonsByDoc((m) => ({ ...m, [docId]: [] }))
      })
  }, [expandedDocId, user, documents])

  // Documents grouped by issue month (newest first) for per-month sub-headers.
  const groupedDocuments = useMemo(() => {
    const sorted = [...documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const groups: { ym: string; docs: FinancialDocument[] }[] = []
    for (const doc of sorted) {
      const ym = doc.issuedAt.slice(0, 7)
      const last = groups[groups.length - 1]
      if (last && last.ym === ym) last.docs.push(doc)
      else groups.push({ ym, docs: [doc] })
    }
    return groups
  }, [documents])

  // Send via WhatsApp / email — the delivered file is a "העתק — נאמן למקור"
  // and a "מסמך ממוחשב" (electronically-transmitted copy).
  // Expanded-row content: the actual performed lessons for a studio-month
  // receipt, otherwise the document's own line items.
  const renderDetail = (doc: FinancialDocument) => {
    const lessons = doc.sourceRef ? lessonsByDoc[doc.id] : undefined
    if (lessons === 'loading') {
      return <p className="doc-detail__note">טוען שיעורים…</p>
    }
    if (Array.isArray(lessons) && lessons.length > 0) {
      return (
        <>
          <p className="doc-detail__heading">שיעורים שבוצעו בפועל</p>
          <div className="doc-detail__list">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="doc-detail__row doc-detail__row--lesson">
                <span>
                  {formatShortDate(lesson.startAt)} · {lesson.title}
                  {lesson.isSwap && ' · החלפה'}
                </span>
                <span>{lesson.durationHours} שע׳</span>
              </div>
            ))}
          </div>
          {doc.note && <p className="doc-detail__note">{doc.note}</p>}
        </>
      )
    }
    if (doc.sourceRef && Array.isArray(lessons)) {
      // Loaded, but no lessons linked to this studio-month.
      return <p className="doc-detail__note">לא נמצאו שיעורים מקושרים לחודש זה.</p>
    }
    return (
      <div className="doc-detail__list">
        {doc.lineItems.map((item, index) => (
          <div key={index} className="doc-detail__row">
            <span>{item.description}</span>
            <span>
              {item.quantity} × {formatILSExact(item.unitPrice)}
            </span>
            <span>{formatILSExact(item.amount)}</span>
          </div>
        ))}
        {doc.note && <p className="doc-detail__note">{doc.note}</p>}
      </div>
    )
  }

  const onShare = async (channel: ShareChannel) => {
    if (!viewed) return
    setSharing(true)
    setShareNote('')
    setMarkComputerized(true)
    setCopyMode(true)
    // Repaint the "העתק"/"מסמך ממוחשב" labels before we grab the node.
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    )
    const node = document
      .getElementById('print-root')
      ?.querySelector('.doc-print') as HTMLElement | null
    if (!node) {
      setMarkComputerized(false)
      setCopyMode(false)
      setSharing(false)
      return
    }
    // Force the full page-width layout so the receipt is never clipped in the PDF.
    node.classList.add('doc-print--capture')
    try {
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      )
      const blob = await elementToPdfBlob(node)
      const number = formatDocumentNumber(viewed.type, viewed.number)
      const label = documentTypeLabel(viewed.type)
      // Pre-fill the recipient from the linked studio's saved contact.
      const studio = viewed.recipient.studioId
        ? studios.find((s) => s.id === viewed.recipient.studioId)
        : undefined
      const outcome = await shareDocumentPdf({
        blob,
        fileName: `${docFileBase(viewed)}.pdf`,
        title: `${label} ${number}`,
        text: `${label} מס׳ ${number} מאת ${viewed.business.legalName} · סה״כ ${formatILSExact(viewed.total)}`,
        channel,
        phone: studio?.phone ?? viewed.recipient.phone,
        email: studio?.email,
      })
      if (outcome === 'fallback') {
        setShareNote(
          channel === 'email'
            ? 'הדפדפן לא תומך בשיתוף קבצים — הקובץ ירד למכשיר ונפתחה טיוטת מייל לצירופו.'
            : 'הדפדפן לא תומך בשיתוף קבצים — הקובץ ירד למכשיר ונפתחה שיחת וואטסאפ.',
        )
      }
    } catch {
      setShareNote('אירעה שגיאה בהכנת הקובץ. נסי שוב.')
    } finally {
      node.classList.remove('doc-print--capture')
      setMarkComputerized(false)
      setCopyMode(false)
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

  /** A throwaway document built from the current form, for the טיוטה preview. */
  const buildPreviewDoc = (): FinancialDocument | null => {
    if (!business || computedItems.length === 0) return null
    const recipient: FinancialDocument['recipient'] = {
      name: form.recipientName.trim() || '—',
    }
    if (form.recipientTaxId.trim()) recipient.taxId = form.recipientTaxId.trim()
    if (form.recipientAddress.trim()) recipient.address = form.recipientAddress.trim()
    return {
      id: 'preview',
      number: 0,
      type: form.type,
      status: 'issued',
      issuedAt: new Date().toISOString(),
      recipient,
      lineItems: computedItems,
      total,
      currency: 'ILS',
      business,
      createdAt: new Date().toISOString(),
      ...(carriesPayment ? { payments: [buildPayment()] } : {}),
      ...(form.note.trim() ? { note: form.note.trim() } : {}),
    }
  }
  const previewDoc = preview ? buildPreviewDoc() : null

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
    if (form.recipientConsent) recipient.consentToDigital = true

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
      setPreview(false)
      if (created) {
        openViewer(created.id)
        // Receipts are backed up to Drive/Sheets from the rendered viewer node.
        if (created.type === 'receipt') setArchivePendingId(created.id)
      }
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
          if (created) openViewer(created.id)
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
          if (created) openViewer(created.id)
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
        <div className="page-head__actions">
          <Button variant="secondary" onClick={() => setShowSequence(true)}>
            בדיקת רצף
          </Button>
          <Button
            variant="secondary"
            onClick={() => setLedgerMonth(currentYearMonth())}
            disabled={!business}
          >
            ריכוז חודשי
          </Button>
          <Button onClick={openNew} disabled={!business}>
            מסמך חדש
          </Button>
        </div>
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
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th aria-hidden="true"></th>
                  <th>מסמך</th>
                  <th>נמען</th>
                  <th>סכום</th>
                  <th aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {groupedDocuments.map((group) => (
                  <Fragment key={group.ym}>
                    <tr className="doc-group">
                      <td colSpan={5}>{formatMonthTitle(group.ym)}</td>
                    </tr>
                    {group.docs.map((doc) => {
                      const canCancel = doc.status === 'issued' && doc.type === 'receipt'
                      const canRefund = doc.status === 'issued' && doc.type === 'receipt'
                      const canVoid = isVoidableDocumentType(doc.type) && doc.status === 'issued'
                      const expanded = expandedDocId === doc.id
                      return (
                        <Fragment key={doc.id}>
                          <tr
                            className="doc-row"
                            onClick={() => setExpandedDocId(expanded ? null : doc.id)}
                            aria-expanded={expanded}
                          >
                            <td className="doc-row__toggle">
                              <span className={expanded ? 'open' : ''}>
                                <Icon name="chevron" size={16} />
                              </span>
                            </td>
                            <td className="doc-row__doc">
                              <strong>
                                {documentTypeLabel(doc.type)}{' '}
                                {formatDocumentNumber(doc.type, doc.number)}
                              </strong>
                              <span className="doc-row__sub">
                                {formatShortDate(doc.issuedAt)}
                                {doc.status === 'cancelled' && (
                                  <span className="doc-row__void"> · מבוטל</span>
                                )}
                              </span>
                            </td>
                            <td>{doc.recipient.name}</td>
                            <td className="doc-row__amount">{formatILSExact(doc.total)}</td>
                            <td
                              className="doc-row__actions"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>
                                <IconButton
                                  label="צפייה והדפסה"
                                  icon="print"
                                  onClick={() => openViewer(doc.id)}
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
                              </span>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="doc-detail">
                              <td colSpan={5}>{renderDetail(doc)}</td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
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

            <label className="check-field">
              <input
                type="checkbox"
                checked={form.recipientConsent}
                onChange={(e) => setField('recipientConsent', e.target.checked)}
              />
              <span>
                <strong>הנמען הסכים לקבלת מסמכים ממוחשבים</strong>
                <span className="check-field__hint">
                  נדרש לפני שליחה דיגיטלית (חוזר 24/2004)
                </span>
              </span>
            </label>

            <p className="form-hint">סה״כ: {formatILSExact(total)}</p>
            {error && <p className="form-error">{error}</p>}
            <div className="row-actions">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                ביטול
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPreview(true)}
                disabled={computedItems.length === 0}
              >
                תצוגה מקדימה
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
            <Button onClick={onPrint}>הדפסה / שמירה כ‑PDF</Button>
            <Button
              className="btn--whatsapp"
              onClick={() => void onShare('whatsapp')}
              disabled={sharing}
            >
              <Icon name="whatsapp" />
              {sharing ? 'מכין…' : 'שליחה בוואטסאפ'}
            </Button>
            <Button variant="secondary" onClick={() => void onShare('email')} disabled={sharing}>
              שליחה במייל
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
              computerized={markComputerized}
            />
          </div>
        </div>
        </Overlay>
      )}

      {previewDoc && (
        <Overlay onClose={() => setPreview(false)}>
          <div
            className="doc-viewer"
            role="dialog"
            aria-modal="true"
            aria-label="תצוגה מקדימה"
            onClick={() => setPreview(false)}
          >
            <div className="doc-viewer__bar" onClick={(e) => e.stopPropagation()}>
              <Button variant="secondary" onClick={() => setPreview(false)}>
                סגירה
              </Button>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <DocumentPrint document={previewDoc} draft />
            </div>
          </div>
        </Overlay>
      )}

      {showSequence && (
        <Overlay onClose={() => setShowSequence(false)}>
          <SequenceCheck
            documents={documents}
            counters={counters}
            onClose={() => setShowSequence(false)}
          />
        </Overlay>
      )}

      {ledgerMonth && business && (
        <Overlay onClose={() => setLedgerMonth(null)}>
          <DocumentLedger
            documents={documents}
            business={business}
            yearMonth={ledgerMonth}
            onYearMonthChange={setLedgerMonth}
            onClose={() => setLedgerMonth(null)}
          />
        </Overlay>
      )}

      <ConfirmSheet request={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
