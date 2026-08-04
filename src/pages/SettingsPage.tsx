import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { Logo } from '../components/Logo'
import { BusinessDetails } from '../components/BusinessDetails'
import { StudiosManager } from '../components/StudiosManager'
import { useAuth } from '../contexts/AuthContext'
import { useLessons } from '../hooks/useLessons'
import { isLocalMode } from '../lib/data'
import { enablePushNotifications, scheduleLocalReminders } from '../lib/firebase/messaging'
import { currentYearMonth } from '../lib/money/calculations'

export function SettingsPage() {
  const { user, logout } = useAuth()
  const { lessons } = useLessons(currentYearMonth())
  const [status, setStatus] = useState('')
  const [installHint, setInstallHint] = useState(false)

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    setInstallHint(isIos && !isStandalone)
  }, [])

  useEffect(() => {
    const id = window.location.hash.replace('#', '')
    if (!id) return
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const onEnableNotifications = async () => {
    if (!user) return
    const result = await enablePushNotifications(user.uid)
    if (result === 'granted') {
      scheduleLocalReminders({
        lessons: lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          startAt: lesson.startAt,
        })),
        monthEndReminder: true,
      })
      setStatus('נוטיפיקציות הופעלו. תזכורות שיעור וסוף חודש מוכנות.')
    } else if (result === 'denied') {
      setStatus('ההרשאה נדחתה. אפשר להפעיל בהגדרות המכשיר.')
    } else {
      setStatus('המכשיר לא תומך בנוטיפיקציות לדפדפן.')
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">הגדרות</p>
          <h1>החשבון שלך</h1>
        </div>
      </div>

      <section className="panel settings-brand">
        <Logo size={64} />
        <div>
          <h2 className="brand-name">MyPilates</h2>
          <p className="hint">
            מעקב שיעורים, שעות ושכר מסטודיוים — תזכורות ומעקב תשלומים למאמנות פילאטיס.
          </p>
          <p className="list-item__meta">{user?.email}</p>
          {isLocalMode() && <span className="badge badge--pending">מצב מקומי</span>}
        </div>
      </section>

      <BusinessDetails />

      <StudiosManager />

      <section className="panel stack-sm">
        <h2>נוטיפיקציות</h2>
        <p className="hint">
          תזכורת כ־45 דקות לפני שיעור, ותזכורת בסוף החודש לוודא שקיבלת תשלום.
          באייפון יש להוסיף את האפליקציה למסך הבית ולהפעיל הרשאות.
        </p>
        <Button onClick={() => void onEnableNotifications()}>הפעלת תזכורות</Button>
        {status && <p className="toast">{status}</p>}
      </section>

      {installHint && (
        <section className="panel">
          <h2>הוספה למסך הבית</h2>
          <ol className="steps">
            <li>לחצי על Share בספארי</li>
            <li>בחרי Add to Home Screen</li>
            <li>פתחי את MyPilates מהאייקון</li>
          </ol>
        </section>
      )}

      <Button variant="danger" onClick={() => void logout()}>
        התנתקות
      </Button>
    </div>
  )
}
