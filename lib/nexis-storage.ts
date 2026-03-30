export const NEXIS_USER_KEY = 'nexis.user.v1'

export type GrowthStage = 'early' | 'growing' | 'scaling'

export type NexisUser = {
  id?: string
  fullName: string
  email: string
  avatar_url?: string | null
  businessName?: string
  industry?: string
  businessDescription?: string
  stage?: GrowthStage
  targetAudience?: string
  biggestChallenge?: string
  marketingChannels?: string[]
  monthlyBudget?: string
  revenueGoal?: string
  trialStartedAt?: string
}

export function readNexisUser(): NexisUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(NEXIS_USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as NexisUser
  } catch {
    return null
  }
}

export function writeNexisUser(user: NexisUser) {
  localStorage.setItem(NEXIS_USER_KEY, JSON.stringify(user))
}

export function patchNexisUser(patch: Partial<NexisUser>) {
  const prev = readNexisUser()
  const next = { ...prev, ...patch } as NexisUser
  writeNexisUser(next)
  return next
}

export function clearNexisUser() {
  localStorage.removeItem(NEXIS_USER_KEY)
}

/** Days remaining in 7-day trial from trialStartedAt (dummy). */
export function trialDaysLeft(user: NexisUser | null): number {
  if (!user?.trialStartedAt) return 6
  const start = new Date(user.trialStartedAt).getTime()
  const end = start + 7 * 24 * 60 * 60 * 1000
  const left = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000))
  return Math.max(0, Math.min(7, left))
}
