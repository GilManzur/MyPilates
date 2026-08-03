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

/** Warm palette for studio calendar chips. */
export const STUDIO_COLORS = [
  '#C4785A', // terracotta
  '#B56B4A', // clay
  '#C4A574', // sand
  '#D4896A', // deep peach
  '#C49A3C', // mustard
  '#A67C52', // golden brown
  '#B87A7A', // warm rose
  '#A65D3F', // burnt sienna
  '#C9922A', // amber
  '#8B7355', // olive brown
  '#B8734D', // copper
  '#C97B6B', // soft coral
]
