import { useMemo } from 'react'
import {
  buildMonthGrid,
  expandedWeekStartKey,
  formatLessonClock,
  localDateKey,
  todayLocalKey,
  weekDateKeys,
  WEEKDAY_LABELS_HE,
} from '../lib/dates'
import type { Lesson, Studio } from '../types'

type Props = {
  yearMonth: string
  lessons: Lesson[]
  studios: Studio[]
  onLessonClick: (lesson: Lesson) => void
  onDayClick?: (date: string) => void
  pickingDay?: boolean
}

export function MonthCalendar({
  yearMonth,
  lessons,
  studios,
  onLessonClick,
  onDayClick,
  pickingDay = false,
}: Props) {
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

  const expandedWeekDates = useMemo(() => {
    const weekKeys = weekDateKeys(expandedWeekStartKey())
    const hasCrowdedDay = weekKeys.some((key) => (lessonsByDate[key]?.length ?? 0) > 1)
    return hasCrowdedDay ? new Set(weekKeys) : new Set<string>()
  }, [lessonsByDate])

  const today = todayLocalKey()

  return (
    <div className={`month-calendar panel${pickingDay ? ' is-picking-day' : ''}`}>
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
          const isExpandedWeek = expandedWeekDates.has(cell.date)
          const visibleLessons = isExpandedWeek ? dayLessons : dayLessons.slice(0, 3)
          const hiddenCount = isExpandedWeek ? 0 : Math.max(0, dayLessons.length - 3)
          const studioName = (studioId: string) => studioMap[studioId]?.name ?? 'סטודיו'

          return (
            <div
              key={cell.date}
              className={`month-calendar__cell${cell.inMonth ? '' : ' is-outside'}${isToday ? ' is-today' : ''}${isExpandedWeek ? ' is-expanded-week' : ''}`}
            >
              <button
                type="button"
                className="month-calendar__day-btn"
                onClick={() => {
                  if (!pickingDay || !onDayClick) return
                  onDayClick(cell.date)
                }}
                aria-label={pickingDay ? `בחרי יום ${dayNum}` : `יום ${dayNum}`}
              >
                <span className="month-calendar__day-num">{dayNum}</span>
              </button>
              <div className="month-calendar__events">
                {visibleLessons.map((lesson) => {
                  const color = studioMap[lesson.studioId]?.color ?? '#5B7C6A'
                  const name = studioName(lesson.studioId)
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
                      title={`${formatLessonClock(lesson.startAt)} ${name}`}
                    >
                      <span className="month-calendar__event-time">{formatLessonClock(lesson.startAt)}</span>
                      <span className="month-calendar__event-title">{name}</span>
                    </button>
                  )
                })}
                {hiddenCount > 0 && (
                  <span className="month-calendar__more">+{hiddenCount}</span>
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
