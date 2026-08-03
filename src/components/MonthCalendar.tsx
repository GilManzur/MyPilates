import { useMemo } from 'react'
import {
  buildMonthGrid,
  formatLessonClock,
  localDateKey,
  todayLocalKey,
  WEEKDAY_LABELS_HE,
} from '../lib/dates'
import type { Lesson, Studio } from '../types'

type Props = {
  yearMonth: string
  lessons: Lesson[]
  studios: Studio[]
  onLessonClick: (lesson: Lesson) => void
  onDayClick?: (date: string) => void
}

export function MonthCalendar({ yearMonth, lessons, studios, onLessonClick, onDayClick }: Props) {
  const studioMap = useMemo(
    () => Object.fromEntries(studios.map((studio) => [studio.id, studio])),
    [studios],
  )

  const cells = useMemo(() => buildMonthGrid(yearMonth), [yearMonth])

  const lessonsByDate = useMemo(() => {
    const map: Record<string, Lesson[]> = {}
    for (const lesson of lessons) {
      if (lesson.status === 'cancelled') continue
      const key = localDateKey(lesson.startAt)
      ;(map[key] ??= []).push(lesson)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.startAt.localeCompare(b.startAt))
    }
    return map
  }, [lessons])

  const today = todayLocalKey()

  return (
    <div className="month-calendar panel">
      <div className="month-calendar__weekdays" aria-hidden="true">
        {WEEKDAY_LABELS_HE.map((label) => (
          <span key={label} className="month-calendar__weekday">
            {label}
          </span>
        ))}
      </div>

      <div className="month-calendar__grid">
        {cells.map((cell) => {
          const dayLessons = lessonsByDate[cell.date] ?? []
          const dayNum = Number(cell.date.slice(8, 10))
          const isToday = cell.date === today

          return (
            <div
              key={cell.date}
              className={`month-calendar__cell${cell.inMonth ? '' : ' is-outside'}${isToday ? ' is-today' : ''}`}
            >
              <button
                type="button"
                className="month-calendar__day-btn"
                onClick={() => onDayClick?.(cell.date)}
                aria-label={`יום ${dayNum}`}
              >
                <span className="month-calendar__day-num">{dayNum}</span>
              </button>
              <div className="month-calendar__events">
                {dayLessons.slice(0, 3).map((lesson) => {
                  const color = studioMap[lesson.studioId]?.color ?? '#5B7C6A'
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      className="month-calendar__event"
                      style={{
                        background: `${color}22`,
                        borderColor: color,
                        color,
                      }}
                      onClick={() => onLessonClick(lesson)}
                      title={`${formatLessonClock(lesson.startAt)} ${lesson.title}`}
                    >
                      <span className="month-calendar__event-time">{formatLessonClock(lesson.startAt)}</span>
                      <span className="month-calendar__event-title">{lesson.title}</span>
                    </button>
                  )
                })}
                {dayLessons.length > 3 && (
                  <span className="month-calendar__more">+{dayLessons.length - 3}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {studios.length > 0 && (
        <ul className="month-calendar__legend">
          {studios.map((studio) => (
            <li key={studio.id}>
              <span className="color-dot" style={{ background: studio.color }} />
              <span>{studio.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
