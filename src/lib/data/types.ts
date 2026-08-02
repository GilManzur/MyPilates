import type { HourEntry, Lesson, Payment, Studio, UserProfile } from '../../types'

export interface DataRepository {
  getProfile(uid: string): Promise<UserProfile | null>
  saveProfile(uid: string, profile: UserProfile): Promise<void>
  listStudios(uid: string): Promise<Studio[]>
  upsertStudio(uid: string, studio: Studio): Promise<void>
  deleteStudio(uid: string, studioId: string): Promise<void>
  listLessons(uid: string, yearMonth: string): Promise<Lesson[]>
  upsertLesson(uid: string, lesson: Lesson): Promise<void>
  deleteLesson(uid: string, lessonId: string): Promise<void>
  listHourEntries(uid: string, yearMonth?: string): Promise<HourEntry[]>
  upsertHourEntry(uid: string, entry: HourEntry): Promise<void>
  deleteHourEntry(uid: string, entryId: string): Promise<void>
  listPayments(uid: string, yearMonth: string): Promise<Payment[]>
  upsertPayment(uid: string, payment: Payment): Promise<void>
  addFcmToken(uid: string, token: string): Promise<void>
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

export const STUDIO_COLORS = ['#5B7C6A', '#6A8A9B', '#8B6F5C', '#6B7B8A', '#7A6B8A', '#5C7A6F']
