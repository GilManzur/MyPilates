import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions'

initializeApp()

// Target the same Firestore database as the client. Set FIRESTORE_DB_ID (e.g.
// 'il' in me-west1) once the data has been migrated to Israel — see
// docs/firestore-israel-migration.md. Defaults to the '(default)' database.
const db = getFirestore(process.env.FIRESTORE_DB_ID || '(default)')
const messaging = getMessaging()

async function sendToTokens(tokens, payload) {
  const unique = [...new Set(tokens.filter(Boolean))]
  if (unique.length === 0) return
  await messaging.sendEachForMulticast({
    tokens: unique,
    notification: payload,
    webpush: {
      headers: { Urgency: 'high' },
      notification: {
        ...payload,
        dir: 'rtl',
        lang: 'he',
      },
    },
  })
}

/** Reminder ~45 minutes before upcoming lessons */
export const lessonReminders = onSchedule('every 15 minutes', async () => {
  const now = Date.now()
  const windowStart = new Date(now + 40 * 60 * 1000).toISOString()
  const windowEnd = new Date(now + 50 * 60 * 1000).toISOString()

  const usersSnap = await db.collection('users').get()
  for (const userDoc of usersSnap.docs) {
    const profile = userDoc.data()
    const tokens = profile.fcmTokens ?? []
    if (tokens.length === 0) continue

    const lessonsSnap = await db
      .collection('users')
      .doc(userDoc.id)
      .collection('lessons')
      .where('startAt', '>=', windowStart)
      .where('startAt', '<', windowEnd)
      .where('status', '==', 'scheduled')
      .get()

    for (const lessonDoc of lessonsSnap.docs) {
      const lesson = lessonDoc.data()
      await sendToTokens(tokens, {
        title: 'תזכורת שיעור — MyPilates',
        body: `${lesson.title || 'שיעור פילאטיס'} מתחיל בעוד כ־45 דקות`,
      })
    }
  }

  logger.info('lessonReminders finished')
})

/** End-of-month payment reminder at 18:00 on the last day of each month (Asia/Jerusalem) */
export const monthEndPaymentReminder = onSchedule(
  {
    schedule: '0 18 28-31 * *',
    timeZone: 'Asia/Jerusalem',
  },
  async () => {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    if (tomorrow.getDate() !== 1) {
      logger.info('Not last day of month, skipping')
      return
    }

    const usersSnap = await db.collection('users').get()
    for (const userDoc of usersSnap.docs) {
      const tokens = userDoc.data().fcmTokens ?? []
      await sendToTokens(tokens, {
        title: 'תזכורת תשלום — MyPilates',
        body: 'סוף החודש: בדקי שקיבלת תשלום מכל הסטודיוים ואשרי באפליקציה.',
      })
    }

    logger.info('monthEndPaymentReminder finished')
  },
)
