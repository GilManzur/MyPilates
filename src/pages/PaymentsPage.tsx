import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { useStudios } from '../hooks/useStudios'
import { useHourEntries } from '../hooks/useHourEntries'
import { usePayments } from '../hooks/usePayments'
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

  const summaries = useMemo(
    () => buildMonthSummaries(studios, entries, payments, yearMonth),
    [studios, entries, payments, yearMonth],
  )

  const studioColor = (studioId: string) =>
    studios.find((studio) => studio.id === studioId)?.color ?? '#5B7C6A'

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">תשלומים</p>
          <h1>סיכום חודשי</h1>
        </div>
      </div>

      <MonthSwitcher yearMonth={yearMonth} onChange={setYearMonth} />

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
            <li key={summary.studioId} className="list-item list-item--column">
              <div className="list-item">
                <span className="color-dot" style={{ background: studioColor(summary.studioId) }} />
                <div className="list-item__body">
                  <p className="list-item__title">{summary.studioName}</p>
                  <p className="list-item__meta">
                    {summary.totalHours} שעות × {formatILS(summary.hourlyRate)}
                  </p>
                </div>
                <p className="amount">{formatILS(summary.amount)}</p>
              </div>
              {summary.paymentStatus === 'confirmed' ? (
                <Button
                  variant="secondary"
                  onClick={() => void unconfirmPayment(summary.studioId, summary.amount)}
                >
                  בטלי אישור תשלום
                </Button>
              ) : (
                <Button
                  onClick={() => void confirmPayment(summary.studioId, summary.amount)}
                  disabled={summary.amount <= 0}
                >
                  אישור שקיבלתי תשלום
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
