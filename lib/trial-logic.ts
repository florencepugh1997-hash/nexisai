export function getTrialStatus(profile: {
  trial_end_date?: string | Date | null,
  is_trial_active?: boolean,
  is_subscribed: boolean
} | null) {
  if (!profile) {
    return {
      isExpired: true,
      daysLeft: 0,
      isSubscribed: false,
      hasFullAccess: false
    }
  }

  // If subscribed, they always have full access, trial dates don't matter
  if (profile.is_subscribed) {
    return {
      isExpired: false,
      daysLeft: 0,
      isSubscribed: true,
      hasFullAccess: true
    }
  }

  // Handle missing trial end date securely
  if (!profile.trial_end_date) {
    return {
      isExpired: true,
      daysLeft: 0,
      isSubscribed: false,
      hasFullAccess: false
    }
  }

  const now = new Date()
  const trialEnd = new Date(profile.trial_end_date)
  const isExpired = now > trialEnd && !profile.is_subscribed
  const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  
  return {
    isExpired,
    daysLeft,
    isSubscribed: profile.is_subscribed,
    hasFullAccess: profile.is_subscribed || !isExpired
  }
}
