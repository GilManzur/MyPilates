import { getToken } from 'firebase/messaging'
import { getFirebaseMessaging, vapidKey } from './app'
import { getRepository } from '../data'

export async function enablePushNotifications(uid: string): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'unsupported'
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const messaging = await getFirebaseMessaging()
  if (messaging && vapidKey) {
    const registration = await navigator.serviceWorker.ready
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    })
    if (token) {
      await getRepository().addFcmToken(uid, token)
    }
  } else {
    // Local / demo mode: still mark reminders as enabled
    localStorage.setItem('mypilates_notifications', 'enabled')
    await getRepository().addFcmToken(uid, `local_${uid}`)
  }

  return 'granted'
}

export function scheduleLocalReminders(options: {
  lessons: { id: string; title: string; startAt: string }[]
  monthEndReminder: boolean
}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const now = Date.now()
  for (const lesson of options.lessons) {
    const start = new Date(lesson.startAt).getTime()
    const remindAt = start - 45 * 60 * 1000
    if (remindAt <= now || remindAt - now > 24 * 60 * 60 * 1000) continue
    const delay = remindAt - now
    window.setTimeout(() => {
      new Notification('תזכורת שיעור — MyPilates', {
        body: `${lesson.title} מתחיל בעוד כ־45 דקות`,
        tag: `lesson_${lesson.id}`,
        dir: 'rtl',
        lang: 'he',
      })
    }, delay)
  }

  if (options.monthEndReminder) {
    const end = new Date()
    end.setMonth(end.getMonth() + 1, 0)
    end.setHours(18, 0, 0, 0)
    const delay = end.getTime() - now
    if (delay > 0 && delay < 48 * 60 * 60 * 1000) {
      window.setTimeout(() => {
        new Notification('תזכורת תשלום — MyPilates', {
          body: 'סוף החודש: בדקי שקיבלת תשלום מכל הסטודיוים ואשרי באפליקציה.',
          tag: 'month_end_payment',
          dir: 'rtl',
          lang: 'he',
        })
      }, delay)
    }
  }
}
