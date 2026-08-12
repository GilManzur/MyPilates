import { Button } from './Button'
import { MonthSwitcher } from './MonthSwitcher'
import { documentTypeLabel, formatDocumentNumber } from '../lib/documents'
import { formatILSExact, isInYearMonth } from '../lib/money/calculations'
import { formatShortDate, formatMonthTitle } from '../lib/dates'
import type { BusinessProfile, FinancialDocument } from '../types'

/**
 * Monthly document ledger / ריכוז — a consolidated printable output of every
 * document issued in the month, in running-number order. Carries all headers
 * required by הוראה 4.01, נספח ה׳ (א)(1)+(2): business name, period, nature of
 * output, production date, page number, and an end-of-output marker.
 */
export function DocumentLedger({
  documents,
  business,
  yearMonth,
  onYearMonthChange,
  onClose,
}: {
  documents: FinancialDocument[]
  business: BusinessProfile
  yearMonth: string
  onYearMonthChange: (next: string) => void
  onClose: () => void
}) {
  const rows = documents
    .filter((doc) => isInYearMonth(doc.issuedAt, yearMonth))
    .sort((a, b) => a.number - b.number)

  // Net total counts live documents only; voided ones (status cancelled) are excluded.
  const netTotal = rows
    .filter((doc) => doc.status === 'issued')
    .reduce((sum, doc) => sum + doc.total, 0)

  const producedAt = formatShortDate(new Date().toISOString())

  return (
    <div className="report-scrim" onClick={onClose}>
      <div
        className="report-sheet report-sheet--wide"
        role="dialog"
        aria-modal="true"
        aria-label="ריכוז חודשי"
        onClick={(e) => e.stopPropagation()}
      >
      <div className="report-sheet__bar">
        <MonthSwitcher yearMonth={yearMonth} onChange={onYearMonthChange} />
        <div className="report-sheet__bar-actions">
          <Button onClick={() => window.print()} disabled={rows.length === 0}>
            הדפסה / PDF
          </Button>
          <Button variant="secondary" onClick={onClose}>
            סגירה
          </Button>
        </div>
      </div>

      <div id="print-root" className="report-sheet__body">
        <article className="doc-ledger" dir="rtl">
          <header className="doc-ledger__head">
            <div>
              <h1>{business.legalName}</h1>
              <p>עוסק פטור · מס׳ עוסק/ת״ז: {business.taxId}</p>
            </div>
            <div className="doc-ledger__meta">
              <span className="doc-ledger__nature">ריכוז מסמכים</span>
              <span>תקופה: {formatMonthTitle(yearMonth)}</span>
              <span>הופק: {producedAt}</span>
              <span>עמוד 1</span>
            </div>
          </header>

          {rows.length === 0 ? (
            <p className="doc-ledger__empty">לא הופקו מסמכים בחודש זה.</p>
          ) : (
            <>
              <table className="doc-ledger__table">
                <thead>
                  <tr>
                    <th>מס׳</th>
                    <th>תאריך</th>
                    <th>סוג</th>
                    <th>נמען</th>
                    <th>סטטוס</th>
                    <th>סכום</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((doc) => (
                    <tr
                      key={doc.id}
                      className={doc.status === 'cancelled' ? 'doc-ledger__row--void' : undefined}
                    >
                      <td>{formatDocumentNumber(doc.type, doc.number)}</td>
                      <td>{formatShortDate(doc.issuedAt)}</td>
                      <td>{documentTypeLabel(doc.type)}</td>
                      <td>{doc.recipient.name}</td>
                      <td>{doc.status === 'cancelled' ? 'מבוטל' : 'תקף'}</td>
                      <td>{formatILSExact(doc.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}>סה״כ נטו (מסמכים תקפים)</td>
                    <td>{formatILSExact(netTotal)}</td>
                  </tr>
                </tfoot>
              </table>
              <p className="doc-ledger__end">— סוף פלט —</p>
            </>
          )}
        </article>
      </div>
      </div>
    </div>
  )
}
