import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  orderBy,
  type Firestore,
} from 'firebase/firestore'
import { db as maybeDb } from '../firebase/app'
import type { HourEntry, Lesson, Payment, Studio, UserProfile } from '../../types'
import type { DataRepository } from './types'

function getDb(): Firestore {
  if (!maybeDb) throw new Error('Firestore is not initialized')
  return maybeDb
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
  }
}
