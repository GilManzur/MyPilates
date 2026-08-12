import { Button } from './Button'
import { findSequenceGaps, formatDocumentNumber } from '../lib/documents'
import type { DocumentCounters } from '../lib/data/types'
import type { FinancialDocument } from '../types'

/**
 * Sequence-integrity report (הוראה 4.01, נספח ה׳ (א)(5)): for every
 * running-number sequence it states explicitly which documents exist and which
 * are missing, rather than only listing what was issued.
 */
export function SequenceCheck({
  documents,
  counters,
  onClose,
}: {
  documents: FinancialDocument[]
  counters: DocumentCounters
  onClose: () => void
}) {
  const reports = findSequenceGaps(documents, counters)
  const totalMissing = reports.reduce((sum, r) => sum + r.missing.length, 0)

  return (
    <div className="report-scrim" onClick={onClose}>
      <div
        className="report-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="בדיקת רצף מסמכים"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="report-sheet__bar">
          <h2>בדיקת רצף מסמכים</h2>
          <Button variant="secondary" onClick={onClose}>
            סגירה
          </Button>
        </div>

        <p
          className={`report-sheet__banner ${
            totalMissing === 0 ? 'report-sheet__banner--ok' : 'report-sheet__banner--bad'
          }`}
        >
          {totalMissing === 0
            ? 'כל הרצפים תקינים — לא חסר אף מסמך.'
            : `נמצאו ${totalMissing} מסמכים חסרים ברצף.`}
        </p>

        <div className="report-sheet__body">
          {reports.map((report) => (
            <section key={report.key} className="seq-card">
              <div className="seq-card__head">
                <span className="seq-card__label">{report.label}</span>
                {report.issuedCount === 0 ? (
                  <span className="seq-pill seq-pill--muted">לא הופקו מסמכים</span>
                ) : report.missing.length === 0 ? (
                  <span className="seq-pill seq-pill--ok">
                    רצף תקין ·{' '}
                    <span dir="ltr">
                      {formatDocumentNumber(report.sampleType, report.first)}–
                      {formatDocumentNumber(report.sampleType, report.last)}
                    </span>
                  </span>
                ) : (
                  <span className="seq-pill seq-pill--bad">{report.missing.length} חסרים</span>
                )}
              </div>
              {report.missing.length > 0 && (
                <p className="seq-card__missing">
                  חסרים:{' '}
                  {report.missing
                    .map((n) => formatDocumentNumber(report.sampleType, n))
                    .join(', ')}
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
