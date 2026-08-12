import type {
  FinancialDocument,
  HourEntry,
  Lesson,
  Payment,
  Studio,
  UserProfile,
} from '../../types'
import { counterKeyForDocumentType, isDeletableDocumentType } from '../documents'
import type { DataRepository, SeedableDocumentCounter } from './types'
import { createId } from './types'

type LocalCounters = {
  documentNumber: number
  invoiceNumber?: number
  demandNumber?: number
}

interface LocalStore {
  profiles: Record<string, UserProfile>
  studios: Record<string, Studio[]>
  lessons: Record<string, Lesson[]>
  hours: Record<string, HourEntry[]>
  payments: Record<string, Payment[]>
  documents: Record<string, FinancialDocument[]>
  counters: Record<string, LocalCounters>
  auth: { uid: string; email: string; password: string; displayName: string } | null
}

const STORAGE_KEY = 'mypilates_local_v1'

function readStore(): LocalStore {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return {
      profiles: {},
      studios: {},
      lessons: {},
      hours: {},
      payments: {},
      documents: {},
      counters: {},
      auth: null,
    }
  }
  const parsed = JSON.parse(raw) as LocalStore
  // Backfill collections added after a store was first created.
  parsed.documents ??= {}
  parsed.counters ??= {}
  return parsed
}

function writeStore(store: LocalStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getLocalAuth() {
  return readStore().auth
}

export function setLocalAuth(
  auth: { uid: string; email: string; password: string; displayName: string } | null,
) {
  const store = readStore()
  store.auth = auth
  writeStore(store)
}

export function createLocalRepository(): DataRepository {
  return {
    async getProfile(uid) {
      return readStore().profiles[uid] ?? null
    },
    async saveProfile(uid, profile) {
      const store = readStore()
      store.profiles[uid] = profile
      writeStore(store)
    },
    async listStudios(uid) {
      return [...(readStore().studios[uid] ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, 'he'),
      )
    },
    async upsertStudio(uid, studio) {
      const store = readStore()
      const list = store.studios[uid] ?? []
      const index = list.findIndex((item) => item.id === studio.id)
      if (index >= 0) list[index] = studio
      else list.push(studio)
      store.studios[uid] = list
      writeStore(store)
    },
    async deleteStudio(uid, studioId) {
      const store = readStore()
      store.studios[uid] = (store.studios[uid] ?? []).filter((item) => item.id !== studioId)
      writeStore(store)
    },
    async listLessons(uid, yearMonth) {
      return (readStore().lessons[uid] ?? [])
        .filter((lesson) => lesson.startAt.startsWith(yearMonth))
        .sort((a, b) => a.startAt.localeCompare(b.startAt))
    },
    async upsertLesson(uid, lesson) {
      const store = readStore()
      const list = store.lessons[uid] ?? []
      const index = list.findIndex((item) => item.id === lesson.id)
      if (index >= 0) list[index] = lesson
      else list.push(lesson)
      store.lessons[uid] = list
      writeStore(store)
    },
    async deleteLesson(uid, lessonId) {
      const store = readStore()
      store.lessons[uid] = (store.lessons[uid] ?? []).filter((item) => item.id !== lessonId)
      writeStore(store)
    },
    async listHourEntries(uid, yearMonth) {
      const list = readStore().hours[uid] ?? []
      const filtered = yearMonth ? list.filter((entry) => entry.date.startsWith(yearMonth)) : list
      return [...filtered].sort((a, b) => b.date.localeCompare(a.date))
    },
    async upsertHourEntry(uid, entry) {
      const store = readStore()
      const list = store.hours[uid] ?? []
      const index = list.findIndex((item) => item.id === entry.id)
      if (index >= 0) list[index] = entry
      else list.push(entry)
      store.hours[uid] = list
      writeStore(store)
    },
    async deleteHourEntry(uid, entryId) {
      const store = readStore()
      store.hours[uid] = (store.hours[uid] ?? []).filter((item) => item.id !== entryId)
      writeStore(store)
    },
    async listPayments(uid, yearMonth) {
      return (readStore().payments[uid] ?? []).filter((payment) => payment.yearMonth === yearMonth)
    },
    async upsertPayment(uid, payment) {
      const store = readStore()
      const list = store.payments[uid] ?? []
      const index = list.findIndex((item) => item.id === payment.id)
      if (index >= 0) list[index] = payment
      else list.push(payment)
      store.payments[uid] = list
      writeStore(store)
    },
    async addFcmToken(uid, token) {
      const store = readStore()
      const profile = store.profiles[uid]
      if (!profile) return
      if (!profile.fcmTokens.includes(token)) {
        profile.fcmTokens = [...profile.fcmTokens, token]
        store.profiles[uid] = profile
        writeStore(store)
      }
    },
    async listDocuments(uid) {
      return [...(readStore().documents[uid] ?? [])].sort((a, b) => b.number - a.number)
    },
    async issueDocument(uid, draft) {
      const store = readStore()
      const counters = store.counters[uid] ?? { documentNumber: 0 }
      const key = counterKeyForDocumentType(draft.type)
      const number = (counters[key] ?? 0) + 1
      const full: FinancialDocument = {
        ...draft,
        id: createId('doc'),
        number,
        status: 'issued',
        createdAt: new Date().toISOString(),
      }
      store.counters[uid] = {
        documentNumber: counters.documentNumber ?? 0,
        invoiceNumber: counters.invoiceNumber,
        demandNumber: counters.demandNumber,
        [key]: number,
      }
      store.documents[uid] = [...(store.documents[uid] ?? []), full]
      writeStore(store)
      return full
    },
    async cancelDocument(uid, originalId, draft) {
      const store = readStore()
      const counters = store.counters[uid] ?? { documentNumber: 0 }
      const number = (counters.documentNumber ?? 0) + 1
      const full: FinancialDocument = {
        ...draft,
        id: createId('doc'),
        number,
        status: 'issued',
        createdAt: new Date().toISOString(),
      }
      store.counters[uid] = {
        documentNumber: number,
        invoiceNumber: counters.invoiceNumber,
        demandNumber: counters.demandNumber,
      }
      const existing = (store.documents[uid] ?? []).map((item) =>
        item.id === originalId ? { ...item, status: 'cancelled' as const } : item,
      )
      store.documents[uid] = [...existing, full]
      writeStore(store)
      return full
    },
    async deleteDocument(uid, documentId) {
      const store = readStore()
      const existing = store.documents[uid] ?? []
      const target = existing.find((item) => item.id === documentId)
      if (!target) throw new Error('המסמך לא נמצא')
      if (!isDeletableDocumentType(target.type)) {
        throw new Error('ניתן למחוק רק חשבונית עסקה או דרישת תשלום')
      }
      store.documents[uid] = existing.filter((item) => item.id !== documentId)
      writeStore(store)
    },
    async getDocumentCounters(uid) {
      const counters = readStore().counters[uid]
      return {
        documentNumber: counters?.documentNumber ?? 0,
        invoiceNumber: counters?.invoiceNumber ?? 0,
        demandNumber: counters?.demandNumber ?? 0,
      }
    },
    async setNextDocumentNumber(uid, next, counter: SeedableDocumentCounter = 'documentNumber') {
      if (!Number.isInteger(next) || next < 1) {
        throw new Error('מספר המסמך הבא חייב להיות מספר שלם חיובי')
      }
      const store = readStore()
      const counters = store.counters[uid] ?? { documentNumber: 0 }
      const current = counters[counter] ?? 0
      if (next < current + 1) {
        throw new Error(`לא ניתן לרדת מתחת למספר ${current + 1}`)
      }
      store.counters[uid] = {
        documentNumber: counters.documentNumber ?? 0,
        invoiceNumber: counters.invoiceNumber,
        demandNumber: counters.demandNumber,
        [counter]: next - 1,
      }
      writeStore(store)
    },
  }
}
