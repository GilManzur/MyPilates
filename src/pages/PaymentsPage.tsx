import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconButton } from '../components/IconButton'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { useStudios } from '../hooks/useStudios'
import { useHourEntries } from '../hooks/useHourEntries'
import { usePayments } from '../hooks/usePayments'
import { useDocuments } from '../hooks/useDocuments'
import { useProfile } from '../hooks/useProfile'
import type { DocumentDraft } from '../lib/data/types'
import {
  buildMonthlyLineItems,
  documentTypeLabel,
  formatDocumentNumber,
} from '../lib/documents'
import { formatMonthTitle } from '../lib/dates'
import type { DocumentType, StudioMonthSummary } from '../types'
import {
  buildMonthSummaries,
  currentYearMonth,
  formatILS,
  pendingAmount,
  totalAmount,
} from '../lib/money/calculations'

export function PaymentsPage() {
  const [yearMonth, setYearMonth] = useState(currentYearMonth())
  const { studios } = useStudios()
  const { entries } = useHourEntries(yearMonth)
  const { payments, confirmPayment, unconfirmPayment } = usePayments(yearMonth)
  const { issue } = useDocuments()
  const { business } = useProfile()
  const [message, setMessage] = useState('')

  const summaries = useMemo(
    () => buildMonthSummaries(studios, entries, payments, yearMonth),
    [studios, entries, payments, yearMonth],
  )

  const studioColor = (studioId: string) =>
    studios.find((studio) => studio.id === studioId)?.color ?? '#5B7C6A'

  const issueForSummary = async (summary: StudioMonthSummary, type: DocumentType) => {
    if (!business) return
    const monthLabel = formatMonthTitle(yearMonth)
    const draft: DocumentDraft = {
      type,
      issuedAt: new Date().toISOString(),
      recipient: { name: summary.studioName, studioId: summary.studioId },
      lineItems: buildMonthlyLineItems(summary, monthLabel),
      total: summary.amount,
      currency: 'ILS',
      business,
      sourceRef: {
        studioId: summary.studioId,
        yearMonth,
        ...(summary.paymentId ? { paymentId: summary.paymentId } : {}),
      },
      ...(type === 'receipt'
        ? { payments: [{ method: 'transfer' as const, amount: summary.amount }] }
        : {}),
    }
    const created = await issue(draft)
    if (created) {
      setMessage(
        `${documentTypeLabel(type)} מס׳ ${formatDocumentNumber(type, created.number)} הופק/ה עבור ${summary.studioName}`,
      )
    }
  }

  return (
    <div className="stack app-desk-pay">
      <div className="page-head">
        <div>
          <p className="eyebrow">תשלומים</p>
          <h1>סיכום חודשי</h1>
        </div>
      </div>

      <MonthSwitcher yearMonth={yearMonth} onChange={setYearMonth} />
      {message && (
        <p className="toast">
          {message} · <Link to="/documents">למסמכים</Link>
        </p>
      )}

      <section className="hero-panel hero-panel--compact">
        <p className="stat-label">ממתין לתשלום</p>
        <p className="stat-value">{formatILS(pendingAmount(summaries))}</p>
        <p className="hint">סה״כ החודש: {formatILS(totalAmount(summaries))}</p>
      </section>

      {summaries.length === 0 ? (
        <p className="empty panel">אין סטודיוים עם שעות בחודש זה — אין מה לכלול בתשלום.</p>
      ) : (
        <ul className="list panel">
          {summaries.map((summary) => (
            <li key={summary.studioId} className="list-item">
              <span className="color-dot" style={{ background: studioColor(summary.studioId) }} />
              <div className="list-item__body">
                <p className="list-item__title">{summary.studioName}</p>
                <p className="list-item__meta">
                  {summary.regularHours > 0
                    ? `${summary.regularHours} שעות × ${formatILS(summary.hourlyRate)}`
                    : ''}
                  {summary.swapAmount > 0
                    ? `${summary.regularHours > 0 ? ' · ' : ''}${summary.swapHours} החלפות × ${formatILS(summary.swapPay)}`
                    : ''}
                  {summary.travelAmount > 0
                    ? ` · ${summary.travelDays} נסיעות × ${formatILS(summary.travelPay)}`
                    : ''}
                </p>
              </div>
              <p className="amount">{formatILS(summary.amount)}</p>
              <div className="list-item__actions">
                {summary.paymentStatus === 'confirmed' ? (
                  <IconButton
                    label="בטלי אישור תשלום"
                    icon="x"
                    variant="secondary"
                    onClick={() => void unconfirmPayment(summary.studioId, summary.amount)}
                  />
                ) : (
                  <IconButton
                    label="אישור שקיבלתי תשלום"
                    icon="check"
                    variant="primary"
                    onClick={() => void confirmPayment(summary.studioId, summary.amount)}
                    disabled={summary.amount <= 0}
                  />
                )}
                {summary.paymentStatus === 'confirmed' ? (
                  <IconButton
                    label="הפק קבלה"
                    icon="moneyIn"
                    variant="primary"
                    disabled={!business || summary.amount <= 0}
                    onClick={() => void issueForSummary(summary, 'receipt')}
                  />
                ) : (
                  <IconButton
                    label="הפק חשבונית עסקה"
                    icon="document"
                    disabled={!business || summary.amount <= 0}
                    onClick={() => void issueForSummary(summary, 'invoice')}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!business && summaries.length > 0 && (
        <p className="hint">
          כדי להפיק קבלות וחשבוניות עסקה, מלאי את <Link to="/settings#business">פרטי העסק</Link>{' '}
          בהגדרות.
        </p>
      )}
    </div>
  )
}
