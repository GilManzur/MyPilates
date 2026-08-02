export type LessonStatus = 'scheduled' | 'completed' | 'cancelled'
export type HourSource = 'lesson' | 'manual'
export type PaymentStatus = 'pending' | 'confirmed'

export interface UserProfile {
  displayName: string
  email: string
  fcmTokens: string[]
}

export interface Studio {
  id: string
  name: string
  hourlyRate: number
  currency: 'ILS'
  color: string
  active: boolean
  createdAt: string
}

export interface Lesson {
  id: string
  studioId: string
  title: string
  startAt: string
  endAt: string
  durationHours: number
  status: LessonStatus
  hoursConfirmed: boolean
  createdAt: string
}

export interface HourEntry {
  id: string
  studioId: string
  date: string
  hours: number
  source: HourSource
  lessonId?: string
  note?: string
  createdAt: string
}

export interface Payment {
  id: string
  studioId: string
  yearMonth: string
  expectedAmount: number
  status: PaymentStatus
  confirmedAt?: string
}

export interface StudioMonthSummary {
  studioId: string
  studioName: string
  hourlyRate: number
  totalHours: number
  amount: number
  paymentStatus: PaymentStatus
  paymentId?: string
}
