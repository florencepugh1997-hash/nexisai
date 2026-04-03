'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Lock, Unlock, Loader2, AlertCircle } from 'lucide-react'
import { useNexisUser } from '@/contexts/nexis-user-context'
import { useSession } from 'next-auth/react'
import { getJourneyAndDashboardData } from '@/app/actions/plans'
import { cn } from '@/lib/utils'
import { getTrialStatus } from '@/lib/trial-logic'
import { GlowButton } from '@/components/glow-button'

export default function JourneyPage() {
  const router = useRouter()
  const { user } = useNexisUser()
  const [plans, setPlans] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [trialStatus, setTrialStatus] = useState<{ isExpired: boolean, isSubscribed: boolean, hasFullAccess: boolean } | null>(null)
  const [now, setNow] = useState(Date.now())
  const [unlockingDays, setUnlockingDays] = useState<Set<number>>(new Set())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  const { data: session, status } = useSession()

  useEffect(() => {
    let cancelled = false;

    if (status === 'loading') return;
    if (!session?.user?.id) {
      router.push('/signin')
      return
    }

    const fetchData = async () => {
      const result = await getJourneyAndDashboardData()
      if (cancelled) return
      
      if (result.error || !result.data) {
        return
      }

      let plansData = result.data.dailyPlans || []
      const subsData = result.data.submissions || []
      const tStatus = getTrialStatus(result.data.profile)
        
        let unlockedAny = false;
        
        // Do NOT call unlock-next-day if trial is expired and user is not subscribed
        if (tStatus.hasFullAccess) {
          const toUnlock = plansData.filter((plan: any) => {
            if (plan.first_opened_at && plan.is_unlocked) {
              const openedAt = new Date(plan.first_opened_at).getTime();
              if (Date.now() >= openedAt + (16 * 60 * 60 * 1000)) {
                const nextDay = plan.day_number + 1;
                const nextDayPlan = plansData.find((p: any) => p.day_number === nextDay);
                return (!nextDayPlan || !nextDayPlan.is_unlocked);
              }
            }
            return false;
          });

          if (toUnlock.length > 0) {
            setUnlockingDays(new Set(toUnlock.map((p: any) => p.day_number)));
            
            for (const plan of toUnlock) {
              try {
                const res = await fetch('/api/unlock-next-day', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ current_day_number: plan.day_number })
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data.unlocked) unlockedAny = true;
                }
              } catch (e) {
                 console.error('Background unlock check failed', e)
              }
            }
            
            if (cancelled) return
            setUnlockingDays(new Set());
          }

          if (unlockedAny) {
             const refetched = await getJourneyAndDashboardData()
             if (refetched.data?.dailyPlans) {
               plansData = refetched.data.dailyPlans
             }
          }
        }

      if (!cancelled) {
        setPlans(plansData)
        setSubmissions(subsData)
        setTrialStatus(tStatus)
        setLoading(false)
      }
    }

    fetchData();

    return () => { cancelled = true }
  }, [router, session, status])

  const days = Array.from({ length: 90 }, (_, i) => i + 1)

  return (
    <div className="space-y-8">
      {trialStatus && !trialStatus.hasFullAccess && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <p className="text-sm font-semibold">Your free trial has ended. Subscribe to continue generating new daily plans.</p>
          </div>
          <GlowButton onClick={() => router.push('/upgrade')} className="shrink-0 rounded-xl px-6">
            Subscribe Now
          </GlowButton>
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Your 90-Day Journey
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Follow your personalized growth plan day by day. Complete each day's task to unlock the next.
        </p>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Loading your journey...
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {days.map((day) => {
            const plan = plans.find((p) => p.day_number === day)
            const isCompleted = submissions.some((s) => s.day_number === day)
            // Even if day > 1 is generated, if we aren't subscribed and it's not opened, we lock it below.
            const isUnlocked = plan?.is_unlocked || day === 1
            const hasBeenOpened = !!plan?.first_opened_at

            const nextDayPlan = plans.find((p) => p.day_number === day + 1)
            const isNextDayLocked = !nextDayPlan?.is_unlocked

            // Trial locks down UNOPENED days completely if expired
            const isTrialLocked = trialStatus && !trialStatus.hasFullAccess && !hasBeenOpened

            let statusIcon = null
            let statusText = ''
            let statusColor = 'border-border/60 bg-card text-muted-foreground'

            if (isCompleted) {
              statusIcon = <Check className="h-4 w-4 text-primary" />
              statusText = 'Completed'
              statusColor = 'border-primary/50 bg-primary/5 text-primary'
            } else if (isTrialLocked) {
              statusIcon = <Lock className="h-4 w-4 text-destructive" />
              statusText = 'Subscribe to continue'
              statusColor = 'border-destructive/30 bg-destructive/10 text-destructive'
            } else if (isUnlocked) {
              statusIcon = <Unlock className="h-4 w-4 text-foreground" />
              statusText = 'Available'
              statusColor = 'border-primary hover:border-primary bg-card text-foreground cursor-pointer shadow-sm hover:shadow-md transition-all'
            } else {
              statusIcon = <Lock className="h-4 w-4 opacity-50" />
              statusText = 'Locked'
            }

            let unlockStatusText = null;
            let isCurrentlyUnlocking = false;

            // Only show timer if trial is active so they aren't teased when they can't actually unlock it
            if (isUnlocked && isNextDayLocked && plan?.first_opened_at && trialStatus?.hasFullAccess) {
              const openedAt = new Date(plan.first_opened_at).getTime();
              const diffMs = (openedAt + 16 * 60 * 60 * 1000) - now;
              
              if (diffMs > 0) {
                const hours = Math.ceil(diffMs / (1000 * 60 * 60));
                unlockStatusText = `Next day unlocks in ${hours} hour${hours !== 1 ? 's' : ''}`;
              } else if (unlockingDays.has(day)) {
                unlockStatusText = "Unlocking next day...";
                isCurrentlyUnlocking = true;
              }
            }

            return (
              <div key={day} className="flex flex-col gap-2">
                <div
                  onClick={() => {
                    if (isTrialLocked) router.push('/upgrade')
                    else if (isUnlocked || isCompleted) router.push(`/journey/${day}`)
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center space-y-2 rounded-xl border p-4 text-center h-full',
                    statusColor,
                    (isUnlocked || isCompleted || isTrialLocked) ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                  )}
                >
                  <span className="font-display text-lg font-bold">Day {day}</span>
                  <div className="flex items-center space-x-1.5 text-xs font-medium">
                    {statusIcon}
                    <span className={cn(isTrialLocked ? "text-[10px] leading-tight" : "")}>{statusText}</span>
                  </div>
                </div>
                {unlockStatusText && (
                  <div className="flex items-center justify-center text-[10px] sm:text-xs text-muted-foreground font-medium w-full text-center">
                    {isCurrentlyUnlocking && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    <span>{unlockStatusText}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
