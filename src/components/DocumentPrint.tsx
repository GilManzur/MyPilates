import { format, parseISO } from 'date-fns'
import { formatILSExact } from '../lib/money/calculations'
import {
  documentTypeLabel,
  formatDocumentNumber,
  PAYMENT_BEARING_TYPES,
  paymentMethodLabel,
} from '../lib/documents'
import type { DocumentPayment, FinancialDocument } from '../types'

/** Logo shown on printed documents; hidden gracefully if the asset is missing. */
const LOGO_SRC = '/brand/logo-on-white.png'

function formatDate(iso: string): string {
  return format(parseISO(iso), 'dd/MM/yyyy')
}

function paymentDetail(payment: DocumentPayment): string {
  const parts: string[] = []
  if (payment.method === 'check') {
    if (payment.bank) parts.push(`בנק ${payment.bank}`)
    if (payment.branch) parts.push(`סניף ${payment.branch}`)
    if (payment.accountNumber) parts.push(`חשבון ${payment.accountNumber}`)
    if (payment.checkNumber) parts.push(`המחאה ${payment.checkNumber}`)
    if (payment.dueDate) parts.push(`פירעון ${formatDate(payment.dueDate)}`)
  }
  if (payment.cardType) parts.push(payment.cardType)
  if (payment.reference) parts.push(payment.reference)
  return parts.join(' · ')
}

export function DocumentPrint({
  document: doc,
  copyLabel = 'מקור',
  draft = false,
  computerized = false,
  producedAt,
}: {
  document: FinancialDocument
  /** "מקור" for the original print, "העתק — נאמן למקור" for reprints. */
  copyLabel?: string
  /** Renders a "טיוטה" watermark for an un-issued preview (נספח ה׳ א3). */
  draft?: boolean
  /** Marks an electronically-delivered copy as a "מסמך ממוחשב" (חוזר 24/2004). */
  computerized?: boolean
  /** ISO date the output is produced ("הופק ב"); defaults to now. */
  producedAt?: string
}) {
  const { business } = doc
  const showLineItems = doc.lineItems.length > 0
  const showPayments =
    PAYMENT_BEARING_TYPES.includes(doc.type) && (doc.payments?.length ?? 0) > 0

  return (
    <article className="doc-print" dir="rtl">
      {draft && <div className="doc-print__draft">טיוטה</div>}
      {doc.status === 'cancelled' && <div className="doc-print__void">מבוטל</div>}

      <header className="doc-print__head">
        <div className="doc-print__business">
          <img
            className="doc-print__logo"
            src={LOGO_SRC}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <h1>{business.legalName}</h1>
          <p>עוסק פטור · מס׳ עוסק/ת״ז: {business.taxId}</p>
          {business.address && <p>{business.address}</p>}
          <p>
            {[business.phone, business.email].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="doc-print__title">
          <span className="doc-print__type">{documentTypeLabel(doc.type)}</span>
          {!draft && <span className="doc-print__origin">{copyLabel}</span>}
          {computerized && <span className="doc-print__computerized">מסמך ממוחשב</span>}
          {!draft && (
            <span className="doc-print__number">
              מס׳ {formatDocumentNumber(doc.type, doc.number)}
            </span>
          )}
          <span className="doc-print__date">תאריך: {formatDate(doc.issuedAt)}</span>
        </div>
      </header>

      <section className="doc-print__parties">
        <div>
          <p className="doc-print__label">לכבוד</p>
          <p className="doc-print__recipient">{doc.recipient.name || '—'}</p>
          {doc.recipient.taxId && <p>ת״ז/עוסק: {doc.recipient.taxId}</p>}
          {doc.recipient.address && <p>{doc.recipient.address}</p>}
        </div>
        {doc.relatedNumber != null && (
          <p className="doc-print__related">
            בגין מסמך מס׳{' '}
            {formatDocumentNumber(doc.relatedType ?? 'receipt', doc.relatedNumber)}
          </p>
        )}
      </section>

      {showLineItems && (
        <table className="doc-print__table">
          <thead>
            <tr>
              <th>תיאור</th>
              <th>כמות</th>
              <th>מחיר יחידה</th>
              <th>סכום</th>
            </tr>
          </thead>
          <tbody>
            {doc.lineItems.map((item, index) => (
              <tr key={index}>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>{formatILSExact(item.unitPrice)}</td>
                <td>{formatILSExact(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="doc-print__total">
        <span>סה״כ</span>
        <strong>{formatILSExact(doc.total)}</strong>
      </div>

      {showPayments && (
        <section className="doc-print__payments">
          <p className="doc-print__label">
            {doc.type === 'refund' ? 'פרטי ההחזר' : 'פרטי התשלום'}
          </p>
          <ul>
            {doc.payments!.map((payment, index) => {
              const detail = paymentDetail(payment)
              return (
                <li key={index}>
                  <span>
                    {paymentMethodLabel(payment.method)}
                    {detail ? ` · ${detail}` : ''}
                  </span>
                  <span>{formatILSExact(payment.amount)}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {doc.note && <p className="doc-print__note">{doc.note}</p>}

      {!draft && (
        <footer className="doc-print__foot">
          <p className="doc-print__produced">
            הופק ב: {formatDate(producedAt ?? new Date().toISOString())} |{' '}
            {documentTypeLabel(doc.type)} {formatDocumentNumber(doc.type, doc.number)} · עמוד 1
            מתוך 1
          </p>
        </footer>
      )}
    </article>
  )
}
