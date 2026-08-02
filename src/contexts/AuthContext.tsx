import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { auth, useLocalData } from '../lib/firebase/app'
import { getRepository } from '../lib/data'
import { getLocalAuth, setLocalAuth } from '../lib/data/localRepo'

interface AuthContextValue {
  user: { uid: string; email: string; displayName: string } | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapFirebaseUser(user: User) {
  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'מאמנת',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (useLocalData) {
      const local = getLocalAuth()
      if (local) {
        setUser({ uid: local.uid, email: local.email, displayName: local.displayName })
      }
      setLoading(false)
      return
    }

    if (!auth) {
      setLoading(false)
      return
    }

    return onAuthStateChanged(auth, (next) => {
      setUser(next ? mapFirebaseUser(next) : null)
      setLoading(false)
    })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    if (useLocalData) {
      const local = getLocalAuth()
      if (!local || local.email !== email || local.password !== password) {
        throw new Error('אימייל או סיסמה שגויים')
      }
      setUser({ uid: local.uid, email: local.email, displayName: local.displayName })
      return
    }
    if (!auth) throw new Error('Firebase לא מוגדר')
    await signInWithEmailAndPassword(auth, email, password)
  }, [])

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const repo = getRepository()
    if (useLocalData) {
      const uid = `local_${crypto.randomUUID().slice(0, 8)}`
      setLocalAuth({ uid, email, password, displayName })
      await repo.saveProfile(uid, { displayName, email, fcmTokens: [] })
      setUser({ uid, email, displayName })
      return
    }
    if (!auth) throw new Error('Firebase לא מוגדר')
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName })
    await repo.saveProfile(cred.user.uid, { displayName, email, fcmTokens: [] })
  }, [])

  const logout = useCallback(async () => {
    if (useLocalData) {
      setUser(null)
      return
    }
    if (!auth) return
    await signOut(auth)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
