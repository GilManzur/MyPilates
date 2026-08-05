import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { useStudios } from '../hooks/useStudios'
import { useLessons } from '../hooks/useLessons'
import { useHourEntries } from '../hooks/useHourEntries'
import { usePayments } from '../hooks/usePayments'
import {
  buildMonthSummaries,
  currentYearMonth,
  formatILS,
  pendingAmount,
  totalAmount,
} from '../lib/money/calculations'
import { formatLessonTime } from '../lib/dates'

export function HomePage() {
  const [yearMonth, setYearMonth] = useState(currentYearMonth())
  const { studios } = useStudios()
  const { lessons } = useLessons(yearMonth)
  const { entries } = useHourEntries(yearMonth)
  const { payments } = usePayments(yearMonth)

  const summaries = useMemo(
    () => buildMonthSummaries(studios, entries, payments, yearMonth),
    [studios, entries, payments, yearMonth],
  )

  const upcoming = lessons
    .filter((lesson) => lesson.status === 'scheduled' && new Date(lesson.startAt) >= new Date())
    .slice(0, 3)

  const studioById = (id: string) => studios.find((s) => s.id === id)
  const studioName = (id: string) => studioById(id)?.name ?? 'סטודיו'

  return (
    <div className="stack app-desk-dash">
      <section className="hero-panel reveal">
        <p className="eyebrow">החודש שלך</p>
        <h1 className="hero-title">MyPilates</h1>
        <p className="hero-copy">סיכום שעות, שיעורים ותשלומים במקום אחד.</p>
        <div className="hero-stats">
          <div>
            <p className="stat-label">מגיע לך</p>
            <p className="stat-value">{formatILS(pendingAmount(summaries))}</p>
          </div>
          <div>
            <p className="stat-label">סה״כ החודש</p>
            <p className="stat-value stat-value--soft">{formatILS(totalAmount(summaries))}</p>
          </div>
        </div>
      </section>

      <MonthSwitcher yearMonth={yearMonth} onChange={setYearMonth} />

      <section className="panel">
        <div className="panel__head">
          <h2>שיעורים קרובים</h2>
          <Link to="/calendar">לכל היומן</Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="empty">אין שיעורים קרובים החודש. הוסיפי ביומן.</p>
        ) : (
          <ul className="list">
            {upcoming.map((lesson) => (
              <li key={lesson.id} className="list-item">
                <span
                  className="color-dot"
                  style={{ background: studioById(lesson.studioId)?.color ?? '#5B7C6A' }}
                />
                <div className="list-item__body">
                  <p className="list-item__title">{studioName(lesson.studioId)}</p>
                  <p className="list-item__meta">
                    {lesson.title} · {formatLessonTime(lesson.startAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>לפי סטודיו</h2>
          <Link to="/payments">תשלומים</Link>
        </div>
        {summaries.length === 0 ? (
          <p className="empty">
            {studios.length === 0
              ? 'הוסיפי סטודיו בהגדרות כדי להתחיל לעקוב אחרי השכר.'
              : 'אין שעות לסטודיוים בחודש הזה.'}
          </p>
        ) : (
          <ul className="list">
            {summaries.map((summary) => (
              <li key={summary.studioId} className="list-item">
                <span
                  className="color-dot"
                  style={{ background: studioById(summary.studioId)?.color ?? '#5B7C6A' }}
                />
                <div className="list-item__body">
                  <p className="list-item__title">{summary.studioName}</p>
                  <p className="list-item__meta">
                    {summary.totalHours} שעות · {formatILS(summary.hourlyRate)}/שעה
                  </p>
                </div>
                <div className="list-item__aside">
                  <p className="amount">{formatILS(summary.amount)}</p>
                  <span className={`badge badge--${summary.paymentStatus}`}>
                    {summary.paymentStatus === 'confirmed' ? 'שולם' : 'ממתין'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
