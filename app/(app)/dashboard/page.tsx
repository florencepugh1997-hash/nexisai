'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNexisUser } from '@/contexts/nexis-user-context'
import { GlowButton } from '@/components/glow-button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { getTrialStatus } from '@/lib/trial-logic'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useNexisUser()
  const [actions, setActions] = useState({
    a1: false,
    a2: false,
    a3: false,
  })
  const [currentDay, setCurrentDay] = useState(1)
  const [trialStatus, setTrialStatus] = useState<{ isExpired: boolean, isSubscribed: boolean, hasFullAccess: boolean, daysLeft: number } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser?.id) {
        router.push('/signin')
        return
      }
      Promise.all([
        supabase
          .from('daily_plans')
          .select('day_number')
          .eq('user_id', authUser.id)
          .eq('is_unlocked', true)
          .order('day_number', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('trial_end_date, is_trial_active, is_subscribed')
          .eq('id', authUser.id)
          .maybeSingle()
      ]).then(([planRes, profileRes]) => {
        if (planRes.data) setCurrentDay(planRes.data.day_number)
        const status = getTrialStatus(profileRes.data)
        setTrialStatus(status)
      })
    })
  }, [router])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const first = user?.fullName?.split(/\s+/)[0] ?? 'there'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {greeting}, {first}
        </h1>
        {trialStatus && trialStatus.isExpired && !trialStatus.isSubscribed ? (
           <div className="mt-4 inline-flex items-center rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive">
             Your trial has ended — Subscribe to continue
           </div>
        ) : trialStatus && !trialStatus.isSubscribed ? (
           <div className={cn("mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold", 
              trialStatus.daysLeft >= 3 ? "border-primary/35 bg-primary/10 text-primary" : "border-amber-500/35 bg-amber-500/10 text-amber-500")}>
             {trialStatus.daysLeft >= 3 
               ? `${trialStatus.daysLeft} day${trialStatus.daysLeft === 1 ? '' : 's'} left in your free trial` 
               : `${trialStatus.daysLeft} day${trialStatus.daysLeft === 1 ? '' : 's'} left — Subscribe now`}
           </div>
        ) : null}
      </div>

      <Card className="rounded-2xl border-primary/25 bg-card p-6">
        <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
          Your Growth Plan is Ready
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Review your 90-day roadmap, phases, and this week&apos;s priorities.
        </p>
        <GlowButton
          type="button"
          className="mt-6 rounded-xl sm:w-auto"
          onClick={() => router.push('/plan')}
        >
          View Plan
        </GlowButton>
      </Card>

      <Card className="rounded-2xl border-primary/25 bg-card p-6">
        <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
          Today's Plan — Day {currentDay}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Continue your 90-day growth journey. Your daily action plan is ready.
        </p>
        <GlowButton
          type="button"
          className="mt-6 rounded-xl sm:w-auto"
          onClick={() => router.push(`/journey/${currentDay}`)}
        >
          View Today's Plan
        </GlowButton>
      </Card>

      <section>
        <h3 className="font-display mb-4 text-base font-bold text-foreground">
          This Week&apos;s Actions
        </h3>
        <div className="space-y-3">
          {[
            {
              id: 'a1' as const,
              label: 'Define your #1 offer and ideal customer in one sentence',
            },
            {
              id: 'a2' as const,
              label: 'Audit top 3 acquisition channels and pick a focus channel',
            },
            {
              id: 'a3' as const,
              label: 'Set one measurable weekly KPI (leads, calls, or revenue)',
            },
          ].map((item) => (
            <label
              key={item.id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/30',
              )}
            >
              <Checkbox
                checked={actions[item.id]}
                onCheckedChange={(v) =>
                  setActions((s) => ({ ...s, [item.id]: Boolean(v) }))
                }
                className="mt-0.5"
              />
              <span className="text-sm text-foreground">{item.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-display mb-4 text-base font-bold text-foreground">
          Your Progress
        </h3>
        <Card className="rounded-2xl border-border/60 bg-card p-5">
          <p className="text-sm text-muted-foreground">Plan completion</p>
          <p className="mt-1 font-display text-2xl font-bold text-primary">34%</p>
          <Progress value={34} className="mt-4 h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            Complete onboarding actions to move faster through Phase 1.
          </p>
        </Card>
      </section>
    </div>
  )
}
