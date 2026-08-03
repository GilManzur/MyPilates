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

/** Distinct studio colors for calendar visibility. */
export const STUDIO_COLORS = [
  '#C45C26', // burnt orange
  '#C49A3C', // mustard
  '#6B8F71', // sage
  '#3D7A6A', // teal
  '#4A7C9B', // ocean blue
  '#5B6B9A', // indigo
  '#8B5A7A', // plum
  '#C45B6A', // rose
  '#A65D3F', // terracotta
  '#7A8B3D', // olive
  '#B87333', // copper
  '#6A5ACD', // slate violet
  '#D4783A', // apricot
  '#2F6F5E', // deep green
  '#9B4D4D', // brick
  '#5C7A9B', // steel blue
]
