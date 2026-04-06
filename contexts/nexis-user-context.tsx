'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  type NexisUser,
  clearNexisUser,
  readNexisUser,
  trialDaysLeft,
  writeNexisUser,
} from '@/lib/nexis-storage'
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react'
import { getUserProfileData } from '@/app/actions/user'

type NexisUserContextValue = {
  user: NexisUser | null
  hydrated: boolean
  setUser: (user: NexisUser | null) => void
  saveUser: (user: NexisUser) => void
  updateUser: (patch: Partial<NexisUser>) => void
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
  trialDaysRemaining: number
}

const NexisUserContext = createContext<NexisUserContextValue | null>(null)

export function NexisUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<NexisUser | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const { data: session, status } = useSession()

  useEffect(() => {
    // Read scoped to the session email if available, else read legacy
    const email = session?.user?.email ?? undefined
    setUserState(readNexisUser(email))
    setHydrated(true)
  }, [session?.user?.email])

  const refreshUser = useCallback(async () => {
    if (!session?.user?.id) return

    const profile = await getUserProfileData()

    if (profile) {
      setUserState(prev => {
        const next = {
          ...(prev || {}),
          id: session.user.id,
          fullName: profile.full_name || prev?.fullName || 'Founder',
          email: session.user.email || prev?.email || '',
          avatar_url: profile.avatar_url,
        } as NexisUser
        writeNexisUser(next)
        return next
      })
    }
  }, [session])

  useEffect(() => {
    if (hydrated) {
      refreshUser()
    }
  }, [hydrated, refreshUser])

  const setUser = useCallback((u: NexisUser | null) => {
    setUserState(u)
    if (u) writeNexisUser(u)
    else clearNexisUser()
  }, [])

  const saveUser = useCallback((u: NexisUser) => {
    writeNexisUser(u)
    setUserState(u)
  }, [])

  const updateUser = useCallback((patch: Partial<NexisUser>) => {
    setUserState((prev) => {
      if (!prev) {
        const next = {
          fullName: patch.fullName ?? 'Founder',
          email: patch.email ?? 'you@example.com',
          ...patch,
        } as NexisUser
        writeNexisUser(next)
        return next
      }
      const next = { ...prev, ...patch }
      writeNexisUser(next)
      return next
    })
  }, [])

  const signOut = useCallback(async () => {
    try {
      await nextAuthSignOut({ redirect: false })
    } finally {
      clearNexisUser(user?.email)
      setUserState(null)
    }
  }, [user?.email])

  const trialDaysRemaining = useMemo(() => trialDaysLeft(user), [user])

  const value = useMemo(
    () => ({
      user,
      hydrated,
      setUser,
      saveUser,
      updateUser,
      refreshUser,
      signOut,
      trialDaysRemaining,
    }),
    [user, hydrated, setUser, saveUser, updateUser, refreshUser, signOut, trialDaysRemaining],
  )

  return (
    <NexisUserContext.Provider value={value}>{children}</NexisUserContext.Provider>
  )
}

export function useNexisUser() {
  const ctx = useContext(NexisUserContext)
  if (!ctx) throw new Error('useNexisUser must be used within NexisUserProvider')
  return ctx
}
