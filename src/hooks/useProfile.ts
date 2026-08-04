import { useCallback, useEffect, useState } from 'react'
import { getRepository } from '../lib/data'
import type { BusinessProfile, UserProfile } from '../types'
import { useAuth } from '../contexts/AuthContext'

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const loaded = await getRepository().getProfile(user.uid)
    setProfile(loaded)
    setLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveBusiness = async (business: BusinessProfile) => {
    if (!user) return
    const base: UserProfile = profile ?? {
      displayName: user.displayName,
      email: user.email,
      fcmTokens: [],
    }
    const next: UserProfile = { ...base, business }
    await getRepository().saveProfile(user.uid, next)
    setProfile(next)
  }

  return { profile, business: profile?.business, loading, refresh, saveBusiness }
}
