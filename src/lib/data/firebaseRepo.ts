import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  orderBy,
  type Firestore,
} from 'firebase/firestore'
import { db as maybeDb } from '../firebase/app'
import type {
  FinancialDocument,
  HourEntry,
  Lesson,
  Payment,
  Studio,
  UserProfile,
} from '../../types'
import { counterKeyForDocumentType, isVoidableDocumentType } from '../documents'
import type { DataRepository, SeedableDocumentCounter } from './types'
import { createId } from './types'

function getDb(): Firestore {
  if (!maybeDb) throw new Error('Firestore is not initialized')
  return maybeDb
}

/** Firestore rejects `undefined` fields; drop them recursively before writing. */
function pruneUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => pruneUndefined(item)) as unknown as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) out[key] = pruneUndefined(val)
    }
    return out as T
  }
  return value
}

function userDoc(uid: string) {
  return doc(getDb(), 'users', uid)
}

function col(uid: string, name: string) {
  return collection(getDb(), 'users', uid, name)
}

export function createFirebaseRepository(): DataRepository {
  return {
    async getProfile(uid) {
      const snap = await getDoc(userDoc(uid))
      return snap.exists() ? (snap.data() as UserProfile) : null
    },
    async saveProfile(uid, profile) {
      await setDoc(userDoc(uid), profile, { merge: true })
    },
    async listStudios(uid) {
      const snap = await getDocs(col(uid, 'studios'))
      return snap.docs
        .map((item) => ({ id: item.id, ...item.data() }) as Studio)
        .sort((a, b) => a.name.localeCompare(b.name, 'he'))
    },
    async upsertStudio(uid, studio) {
      const { id, ...data } = studio
      await setDoc(doc(getDb(), 'users', uid, 'studios', id), data, { merge: true })
    },
    async deleteStudio(uid, studioId) {
      await deleteDoc(doc(getDb(), 'users', uid, 'studios', studioId))
    },
    async listLessons(uid, yearMonth) {
      const start = `${yearMonth}-01T00:00:00.000Z`
      const [y, m] = yearMonth.split('-').map(Number)
      const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
      const end = `${nextMonth}-01T00:00:00.000Z`
      const q = query(
        col(uid, 'lessons'),
        where('startAt', '>=', start),
        where('startAt', '<', end),
        orderBy('startAt', 'asc'),
      )
      const snap = await getDocs(q)
      return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as Lesson)
    },
    async upsertLesson(uid, lesson) {
      const { id, ...data } = lesson
      await setDoc(doc(getDb(), 'users', uid, 'lessons', id), data, { merge: true })
    },
    async deleteLesson(uid, lessonId) {
      await deleteDoc(doc(getDb(), 'users', uid, 'lessons', lessonId))
    },
    async listHourEntries(uid, yearMonth) {
      if (!yearMonth) {
        const snap = await getDocs(col(uid, 'hourEntries'))
        return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as HourEntry)
      }
      const start = `${yearMonth}-01`
      const [y, m] = yearMonth.split('-').map(Number)
      const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
      const end = `${nextMonth}-01`
      const q = query(
        col(uid, 'hourEntries'),
        where('date', '>=', start),
        where('date', '<', end),
        orderBy('date', 'desc'),
      )
      const snap = await getDocs(q)
      return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as HourEntry)
    },
    async upsertHourEntry(uid, entry) {
      const { id, ...data } = entry
      await setDoc(doc(getDb(), 'users', uid, 'hourEntries', id), data, { merge: true })
    },
    async deleteHourEntry(uid, entryId) {
      await deleteDoc(doc(getDb(), 'users', uid, 'hourEntries', entryId))
    },
    async listPayments(uid, yearMonth) {
      const q = query(col(uid, 'payments'), where('yearMonth', '==', yearMonth))
      const snap = await getDocs(q)
      return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as Payment)
    },
    async upsertPayment(uid, payment) {
      const { id, ...data } = payment
      await setDoc(doc(getDb(), 'users', uid, 'payments', id), data, { merge: true })
    },
    async addFcmToken(uid, token) {
      const profile = await this.getProfile(uid)
      if (!profile) return
      if (!profile.fcmTokens.includes(token)) {
        await this.saveProfile(uid, {
          ...profile,
          fcmTokens: [...profile.fcmTokens, token],
        })
      }
    },
    async listDocuments(uid) {
      const snap = await getDocs(col(uid, 'documents'))
      return snap.docs
        .map((item) => ({ id: item.id, ...item.data() }) as FinancialDocument)
        .sort((a, b) => b.number - a.number)
    },
    async issueDocument(uid, draft) {
      const db = getDb()
      const counterId = counterKeyForDocumentType(draft.type)
      const counterRef = doc(db, 'users', uid, 'counters', counterId)
      const id = createId('doc')
      const docRef = doc(db, 'users', uid, 'documents', id)
      return runTransaction(db, async (tx) => {
        const counterSnap = await tx.get(counterRef)
        const number = (counterSnap.exists() ? (counterSnap.data().value as number) : 0) + 1
        const full: FinancialDocument = {
          ...draft,
          id,
          number,
          status: 'issued',
          createdAt: new Date().toISOString(),
        }
        tx.set(counterRef, { value: number }, { merge: true })
        const { id: _id, ...data } = full
        tx.set(docRef, pruneUndefined(data))
        return full
      })
    },
    async cancelDocument(uid, originalId, draft) {
      const db = getDb()
      const counterRef = doc(db, 'users', uid, 'counters', 'documentNumber')
      const originalRef = doc(db, 'users', uid, 'documents', originalId)
      const id = createId('doc')
      const docRef = doc(db, 'users', uid, 'documents', id)
      return runTransaction(db, async (tx) => {
        const counterSnap = await tx.get(counterRef)
        const number = (counterSnap.exists() ? (counterSnap.data().value as number) : 0) + 1
        const full: FinancialDocument = {
          ...draft,
          id,
          number,
          status: 'issued',
          createdAt: new Date().toISOString(),
        }
        tx.set(counterRef, { value: number }, { merge: true })
        tx.update(originalRef, { status: 'cancelled' })
        const { id: _id, ...data } = full
        tx.set(docRef, pruneUndefined(data))
        return full
      })
    },
    async voidDocument(uid, documentId) {
      const db = getDb()
      const docRef = doc(db, 'users', uid, 'documents', documentId)
      const snap = await getDoc(docRef)
      if (!snap.exists()) throw new Error('המסמך לא נמצא')
      const type = snap.data().type as FinancialDocument['type']
      if (!isVoidableDocumentType(type)) {
        throw new Error('ניתן לבטל כאן רק חשבונית עסקה או דרישת תשלום')
      }
      // Void in place — the record is kept, never deleted (קובץ קבוע).
      await updateDoc(docRef, { status: 'cancelled' })
    },
    async markOriginalPrinted(uid, documentId) {
      const db = getDb()
      const docRef = doc(db, 'users', uid, 'documents', documentId)
      return runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef)
        if (!snap.exists()) throw new Error('המסמך לא נמצא')
        const existing = snap.data().originalPrintedAt as string | undefined
        if (existing) return existing
        const stamp = new Date().toISOString()
        tx.update(docRef, { originalPrintedAt: stamp })
        return stamp
      })
    },
    async getDocumentCounters(uid) {
      const db = getDb()
      const [legalSnap, invoiceSnap, demandSnap] = await Promise.all([
        getDoc(doc(db, 'users', uid, 'counters', 'documentNumber')),
        getDoc(doc(db, 'users', uid, 'counters', 'invoiceNumber')),
        getDoc(doc(db, 'users', uid, 'counters', 'demandNumber')),
      ])
      return {
        documentNumber: legalSnap.exists() ? (legalSnap.data().value as number) : 0,
        invoiceNumber: invoiceSnap.exists() ? (invoiceSnap.data().value as number) : 0,
        demandNumber: demandSnap.exists() ? (demandSnap.data().value as number) : 0,
      }
    },
    async setNextDocumentNumber(uid, next, counter: SeedableDocumentCounter = 'documentNumber') {
      if (!Number.isInteger(next) || next < 1) {
        throw new Error('מספר המסמך הבא חייב להיות מספר שלם חיובי')
      }
      const db = getDb()
      const counterRef = doc(db, 'users', uid, 'counters', counter)
      await runTransaction(db, async (tx) => {
        const counterSnap = await tx.get(counterRef)
        const current = counterSnap.exists() ? (counterSnap.data().value as number) : 0
        if (next < current + 1) {
          throw new Error(`לא ניתן לרדת מתחת למספר ${current + 1}`)
        }
        tx.set(counterRef, { value: next - 1 }, { merge: true })
      })
    },
  }
}
