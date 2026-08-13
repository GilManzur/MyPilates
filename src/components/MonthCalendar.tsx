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
import { eventInk } from '../lib/colors'
import { DEFAULT_STUDIO_COLOR } from '../lib/data/types'
import { hoursFromLesson } from '../lib/money/calculations'
import type { Lesson, Studio } from '../types'

const MAX_HOUR_DOTS = 6

function hourDotsForDay(lessons: Lesson[], studioMap: Record<string, Studio>) {
  const dots: { key: string; color: string }[] = []
  for (const lesson of lessons) {
    const hours = Math.max(1, Math.round(hoursFromLesson(lesson)))
    const color = studioMap[lesson.studioId]?.color ?? DEFAULT_STUDIO_COLOR
    for (let i = 0; i < hours; i++) {
      dots.push({ key: `${lesson.id}-${i}`, color })
    }
  }
  return dots
}

type Props = {
  yearMonth: string
  lessons: Lesson[]
  studios: Studio[]
  onLessonClick: (lesson: Lesson) => void
  onDayClick?: (date: string) => void
  /** Selecting a day outside picking mode (opens the day agenda on mobile). */
  onDaySelect?: (date: string) => void
  selectedDate?: string
  pickingDay?: boolean
}

export function MonthCalendar({
  yearMonth,
  lessons,
  studios,
  onLessonClick,
  onDayClick,
  onDaySelect,
  selectedDate,
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
      <div className="month-calendar__weekdays" role="row">
        {WEEKDAY_LABELS_HE.map((label) => (
          <span key={label} className="month-calendar__weekday" role="columnheader">
            {label}
          </span>
        ))}
      </div>

      <div className="month-calendar__grid">
        {cells.map((cell) => {
          const dayLessons = lessonsByDate[cell.date] ?? []
          const dayNum = Number(cell.date.slice(8, 10))
          const isToday = cell.date === today
          const isSelected = cell.date === selectedDate
          const isExpandedWeek = expandedWeekDates.has(cell.date)
          const visibleLessons = isExpandedWeek ? dayLessons : dayLessons.slice(0, 3)
          const hiddenCount = isExpandedWeek ? 0 : Math.max(0, dayLessons.length - 3)
          const hourDots = hourDotsForDay(dayLessons, studioMap)
          const visibleDots = hourDots.slice(0, MAX_HOUR_DOTS)
          const hiddenHours = Math.max(0, hourDots.length - visibleDots.length)
          const studioName = (studioId: string) => studioMap[studioId]?.name ?? 'סטודיו'

          return (
            <div
              key={cell.date}
              className={`month-calendar__cell${cell.inMonth ? '' : ' is-outside'}${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}${isExpandedWeek ? ' is-expanded-week' : ''}`}
            >
              <button
                type="button"
                className="month-calendar__day-btn"
                onClick={() => {
                  if (pickingDay) {
                    onDayClick?.(cell.date)
                    return
                  }
                  onDaySelect?.(cell.date)
                }}
                aria-label={
                  pickingDay
                    ? `בחרי יום ${dayNum}`
                    : `יום ${dayNum} · ${hourDots.length} שע׳ · ${dayLessons.length} שיעורים`
                }
              >
                <span className="month-calendar__day-num">{dayNum}</span>
              </button>
              {hourDots.length > 0 && (
                <div className="month-calendar__dots" aria-hidden="true">
                  {visibleDots.map((dot) => (
                    <span
                      key={dot.key}
                      className="month-calendar__dot"
                      style={{ background: dot.color }}
                    />
                  ))}
                  {hiddenHours > 0 && (
                    <span className="month-calendar__dots-more">+{hiddenHours}</span>
                  )}
                </div>
              )}
              <div className="month-calendar__events">
                {visibleLessons.map((lesson) => {
                  const color = studioMap[lesson.studioId]?.color ?? DEFAULT_STUDIO_COLOR
                  const name = studioName(lesson.studioId)
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      className="month-calendar__event"
                      style={{
                        background: `${color}22`,
                        borderColor: color,
                        color: eventInk(color),
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
