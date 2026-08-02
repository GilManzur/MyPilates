import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Button } from '../components/Button'
import { Field, TextInput } from '../components/Field'
import { useAuth } from '../contexts/AuthContext'
import { isLocalMode } from '../lib/data'

export function LoginPage() {
  const { user, loading, login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(email.trim(), password)
      else await register(email.trim(), password, displayName.trim() || 'מאמנת')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהתחברות')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-hero">
        <Logo size={88} />
        <h1 className="auth-brand">MyPilates</h1>
        <p className="auth-tagline">
          מעקב שיעורים, שעות ושכר מסטודיוים — תזכורות ומעקב תשלומים למאמנות פילאטיס.
        </p>
      </div>

      <form className="auth-form panel" onSubmit={onSubmit}>
        <div className="segmented">
          <button
            type="button"
            className={mode === 'login' ? 'is-active' : ''}
            onClick={() => setMode('login')}
          >
            התחברות
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'is-active' : ''}
            onClick={() => setMode('register')}
          >
            הרשמה
          </button>
        </div>

        {mode === 'register' && (
          <Field label="שם לתצוגה">
            <TextInput
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="למשל יָם"
              autoComplete="name"
            />
          </Field>
        )}

        <Field label="אימייל">
          <TextInput
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            dir="ltr"
          />
        </Field>

        <Field label="סיסמה">
          <TextInput
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            dir="ltr"
          />
        </Field>

        {error && <p className="form-error">{error}</p>}

        <Button type="submit" disabled={busy}>
          {busy ? 'רגע…' : mode === 'login' ? 'כניסה' : 'יצירת חשבון'}
        </Button>

        {isLocalMode() && (
          <p className="hint">
            מצב מקומי פעיל (בלי Firebase). אחרי יצירת פרויקט Firebase עדכני את קובץ `.env` וכבי את
            `VITE_USE_LOCAL_DATA`.
          </p>
        )}
      </form>
    </div>
  )
}
