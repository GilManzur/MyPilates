import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconButton } from '../components/IconButton'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { ConfirmSheet, type ConfirmRequest } from '../components/ConfirmSheet'
import {
  PaymentMethodSheet,
  type PaymentSheetRequest,
} from '../components/PaymentMethodSheet'
import { useStudios } from '../hooks/useStudios'
import { useHourEntries } from '../hooks/useHourEntries'
import { usePayments } from '../hooks/usePayments'
import { useDocuments } from '../hooks/useDocuments'
import { useProfile } from '../hooks/useProfile'
import type { DocumentDraft } from '../lib/data/types'
import type { DocumentPayment } from '../types'
import {
  buildMonthlyLineItems,
  documentTypeLabel,
  formatDocumentNumber,
} from '../lib/documents'
import { formatMonthTitle } from '../lib/dates'
import { DEFAULT_STUDIO_COLOR } from '../lib/data/types'
import type { DocumentType, StudioMonthSummary } from '../types'
import {
  buildMonthSummaries,
  formatILS,
  pendingAmount,
  remainingEntriesForStudioMonth,
  totalAmount,
} from '../lib/money/calculations'
import { useViewMonth } from '../contexts/ViewMonthContext'

export function PaymentsPage() {
  const { yearMonth, setYearMonth } = useViewMonth()
  const { studios, loading: studiosLoading } = useStudios()
  const { entries, loading: entriesLoading } = useHourEntries(yearMonth)
  const { payments, loading: paymentsLoading, confirmPayment, unconfirmPayment } =
    usePayments(yearMonth)
  const loading = studiosLoading || entriesLoading || paymentsLoading
  const { issue, documents } = useDocuments()
  const { business } = useProfile()
  const [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [paymentSheet, setPaymentSheet] = useState<PaymentSheetRequest | null>(null)

  const summaries = useMemo(
    () => buildMonthSummaries(studios, entries, payments, yearMonth),
    [studios, entries, payments, yearMonth],
  )

  const studioColor = (studioId: string) =>
    studios.find((studio) => studio.id === studioId)?.color ?? DEFAULT_STUDIO_COLOR

  /** The un-billed ("remaining") summary for a studio-month and document type. */
  const remainingSummaryFor = (
    summary: StudioMonthSummary,
    type: DocumentType,
  ): StudioMonthSummary | undefined => {
    const studio = studios.find((s) => s.id === summary.studioId)
    if (!studio) return undefined
    const remaining = remainingEntriesForStudioMonth(
      entries,
      documents,
      summary.studioId,
      yearMonth,
      type,
    )
    if (remaining.length === 0) return undefined
    return buildMonthSummaries([studio], remaining, payments, yearMonth)[0]
  }

  const issueRemaining = async (summary: StudioMonthSummary, type: DocumentType) => {
    if (!business) return
    const type_ = type
    const studio = studios.find((s) => s.id === summary.studioId)
    if (!studio) return
    const remaining = remainingEntriesForStudioMonth(
      entries,
      documents,
      summary.studioId,
      yearMonth,
      type_,
    )
    const subset = buildMonthSummaries([studio], remaining, payments, yearMonth)[0]
    if (!subset || subset.amount <= 0) return

    const lineItems = buildMonthlyLineItems(subset, formatMonthTitle(yearMonth))
    const sourceRef = {
      studioId: summary.studioId,
      yearMonth,
      entryIds: remaining.map((entry) => entry.id),
      ...(summary.paymentId ? { paymentId: summary.paymentId } : {}),
    }

    if (type_ === 'receipt') {
      setPaymentSheet({
        studioName: summary.studioName,
        studioId: summary.studioId,
        amount: subset.amount,
        lineItems,
        business,
        sourceRef,
      })
      return
    }

    setConfirm({
      title: `להפיק ${documentTypeLabel(type_)} על ${formatILS(subset.amount)}?`,
      message: `עבור ${summary.studioName} · ${remaining.length} רשומות שעדיין לא התקבלו החודש. אפשר לבטל מאוחר יותר במסך המסמכים והשיעורים יחזרו ליתרה.`,
      confirmLabel: 'הפיקי',
      danger: false,
      onConfirm: () => {
        void (async () => {
          const draft: DocumentDraft = {
            type: type_,
            issuedAt: new Date().toISOString(),
            recipient: { name: summary.studioName, studioId: summary.studioId },
            lineItems,
            total: subset.amount,
            currency: 'ILS',
            business,
            sourceRef,
          }
          const created = await issue(draft)
          if (created) {
            setMessage(
              `${documentTypeLabel(type_)} מס׳ ${formatDocumentNumber(type_, created.number)} הופק/ה עבור ${summary.studioName}`,
            )
          }
        })()
      },
    })
  }

  const onPaymentConfirm = (payment: DocumentPayment) => {
    if (!paymentSheet) return
    void (async () => {
      const draft: DocumentDraft = {
        type: 'receipt',
        issuedAt: new Date().toISOString(),
        recipient: { name: paymentSheet.studioName, studioId: paymentSheet.studioId },
        lineItems: paymentSheet.lineItems,
        total: paymentSheet.amount,
        currency: 'ILS',
        business: paymentSheet.business,
        sourceRef: paymentSheet.sourceRef,
        payments: [payment],
      }
      const created = await issue(draft)
      if (created) {
        setMessage(
          `קבלה מס׳ ${formatDocumentNumber('receipt', created.number)} הופקה עבור ${paymentSheet.studioName}`,
        )
      }
    })()
  }

  /** Per-studio view model shared by the mobile cards and the desktop table. */
  const rows = useMemo(
    () =>
      summaries.map((summary) => {
        const activeType: DocumentType =
          summary.paymentStatus === 'confirmed' ? 'receipt' : 'invoice'
        const remaining = remainingSummaryFor(summary, activeType)
        const remainingAmount = remaining?.amount ?? 0
        const coveredAmount = Math.round((summary.amount - remainingAmount) * 100) / 100
        return {
          summary,
          activeType,
          remainingAmount,
          coveredAmount,
          confirmed: summary.paymentStatus === 'confirmed',
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [summaries, documents, entries, studios, payments, yearMonth],
  )

  type Row = (typeof rows)[number]

  const detailContent = ({ summary, activeType, coveredAmount, remainingAmount }: Row) => (
    <>
      <span className="pay-row__hours">
        {summary.regularHours > 0
          ? `${summary.regularHours} שעות × ${formatILS(summary.hourlyRate)}`
          : ''}
        {summary.swapAmount > 0
          ? `${summary.regularHours > 0 ? ' · ' : ''}${summary.swapHours} החלפות × ${formatILS(summary.swapPay)}`
          : ''}
        {summary.travelAmount > 0
          ? ` · ${summary.travelDays} נסיעות × ${formatILS(summary.travelPay)}`
          : ''}
      </span>
      {coveredAmount > 0 && activeType === 'receipt' && (
        <span className="pay-row__covered">
          כבר התקבל: {formatILS(coveredAmount)}
          {remainingAmount > 0 ? ` · נותר: ${formatILS(remainingAmount)}` : ' · הכול התקבל'}
        </span>
      )}
    </>
  )

  const actionButtons = ({ summary, confirmed, coveredAmount, remainingAmount }: Row) => (
    <>
      {confirmed ? (
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
      {confirmed ? (
        <IconButton
          label={coveredAmount > 0 ? 'הפק קבלה על היתרה' : 'הפק קבלה'}
          icon="moneyIn"
          variant="primary"
          disabled={!business || remainingAmount <= 0}
          onClick={() => void issueRemaining(summary, 'receipt')}
        />
      ) : (
        <IconButton
          label={coveredAmount > 0 ? 'הפק חשבונית על היתרה' : 'הפק חשבונית עסקה'}
          icon="document"
          disabled={!business || remainingAmount <= 0}
          onClick={() => void issueRemaining(summary, 'invoice')}
        />
      )}
    </>
  )

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

      {loading ? (
        <p className="empty panel">טוען…</p>
      ) : summaries.length === 0 ? (
        <p className="empty panel">אין סטודיוים עם שעות בחודש זה — אין מה לכלול בתשלום.</p>
      ) : (
        <>
          {/* Mobile: one stacked card per studio — the status toggle stays in
              reach without any horizontal scroll. */}
          <div className="pay-cards">
            {rows.map((row) => (
              <article key={row.summary.studioId} className="panel pay-card">
                <div className="pay-card__head">
                  <span className="pay-row__studio">
                    <span
                      className="color-dot"
                      style={{ background: studioColor(row.summary.studioId) }}
                    />
                    <span className="pay-row__name">{row.summary.studioName}</span>
                  </span>
                  <span
                    className={`badge ${row.confirmed ? 'badge--confirmed' : 'badge--pending'}`}
                  >
                    {row.confirmed ? 'שולם' : 'ממתין'}
                  </span>
                </div>
                <div className="pay-card__body">
                  <span className="pay-card__detail">{detailContent(row)}</span>
                  <span className="pay-card__amount">{formatILS(row.summary.amount)}</span>
                </div>
                <div className="pay-card__actions">{actionButtons(row)}</div>
              </article>
            ))}
          </div>

          {/* Tablet / desktop: the dense table view. */}
          <div className="panel pay-table-wrap">
            <table className="pay-table">
              <thead>
                <tr>
                  <th>סטודיו</th>
                  <th>פירוט</th>
                  <th className="pay-table__num">סכום</th>
                  <th>סטטוס</th>
                  <th className="pay-table__act">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.summary.studioId} className="pay-row">
                    <td className="pay-row__studio">
                      <span
                        className="color-dot"
                        style={{ background: studioColor(row.summary.studioId) }}
                      />
                      <span className="pay-row__name">{row.summary.studioName}</span>
                    </td>
                    <td className="pay-row__detail">{detailContent(row)}</td>
                    <td className="pay-row__amount">{formatILS(row.summary.amount)}</td>
                    <td>
                      <span
                        className={`badge ${row.confirmed ? 'badge--confirmed' : 'badge--pending'}`}
                      >
                        {row.confirmed ? 'שולם' : 'ממתין'}
                      </span>
                    </td>
                    <td className="pay-row__actions">{actionButtons(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!business && summaries.length > 0 && (
        <p className="hint">
          כדי להפיק קבלות וחשבוניות עסקה, מלאי את <Link to="/settings#business">פרטי העסק</Link>{' '}
          בהגדרות.
        </p>
      )}

      <ConfirmSheet request={confirm} onClose={() => setConfirm(null)} />
      <PaymentMethodSheet
        request={paymentSheet}
        onClose={() => setPaymentSheet(null)}
        onConfirm={onPaymentConfirm}
      />
    </div>
  )
}
