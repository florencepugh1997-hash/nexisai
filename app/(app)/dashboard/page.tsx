'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNexisUser } from '@/contexts/nexis-user-context'
import { GlowButton } from '@/components/glow-button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { useSession } from 'next-auth/react'
import { getJourneyAndDashboardData } from '@/app/actions/plans'
import { cn } from '@/lib/utils'
import { getTrialStatus } from '@/lib/trial-logic'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useNexisUser()
  
  const [loading, setLoading] = useState(true)
  const [currentDay, setCurrentDay] = useState(1)
  const [progress, setProgress] = useState({ percent: 0, completed: 0 })
  const [actionItems, setActionItems] = useState<{ id: string, label: string }[]>([])
  const [trialStatus, setTrialStatus] = useState<{ isExpired: boolean, isSubscribed: boolean, hasFullAccess: boolean, daysLeft: number } | null>(null)
  const [actionsChecked, setActionsChecked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await getJourneyAndDashboardData()
      if (cancelled) return
      if (result.error || !result.data) {
        router.push('/signin')
        return
      }

      const { dailyPlans: dPlans = [], submissions: subs = [], profile } = result.data

      
      if (cancelled) return

      // 1. Trial Status
      const tStatus = getTrialStatus(profile)
      setTrialStatus(tStatus)

      // 2. Progress Calculations
      const dailyPlans = dPlans || []
      const submissions = subs || []
      
      const daysSubmittedCount = submissions.length
      const calculatedCurrentDay = daysSubmittedCount + 1
      const progressPercentage = Math.min(Math.round((daysSubmittedCount / 90) * 100), 100)
      
      setCurrentDay(calculatedCurrentDay)
      setProgress({ percent: progressPercentage, completed: daysSubmittedCount })

      // 3. Action Items Extraction
      // Find the plan for the current day
      const todayPlan = dailyPlans.find(p => p.day_number === calculatedCurrentDay && p.is_unlocked)
      
      if (todayPlan?.content) {
        const content = todayPlan.content
        let sections = content.split(/\n(?=[A-Z\s]{5,20}\n|#+ )/)
        
        // Find "STEP BY STEP" or "YOUR MAIN TASK"
        let taskSection = sections.find(s => s.includes('STEP BY STEP') || s.includes('YOUR MAIN TASK'))
        
        if (taskSection) {
          // Extract lines that look like list items or paragraphs
          const items = taskSection
            .split('\n')
            .filter(line => line.trim() && !line.match(/^[A-Z\s]{5,20}$/) && !line.startsWith('#'))
            .map(line => line.replace(/^\d+\.\s+/, '').trim())
            .filter(line => line.length > 10) // Filter out noise
            .slice(0, 3)
            
          setActionItems(items.map((label, i) => ({ id: `task-${i}`, label })))
        }
      }

      setLoading(false)
    })()
    
    return () => { cancelled = true }
  }, [router])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const first = user?.fullName?.split(/\s+/)[0] ?? 'there'

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-2xl border-primary/25 bg-card p-6 flex flex-col items-start">
          <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
            Your Growth Plan
          </h2>
          <p className="mt-2 text-sm text-muted-foreground mb-6">
            Review your 90-day roadmap, phases, and key priorities.
          </p>
          <GlowButton
            type="button"
            className="mt-auto rounded-xl w-full sm:w-auto"
            onClick={() => router.push('/plan')}
          >
            View Full Plan
          </GlowButton>
        </Card>

        <Card className="rounded-2xl border-primary/25 bg-card p-6 flex flex-col items-start">
          <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
            Today's Plan — Day {currentDay}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground mb-6">
            Continue your 90-day growth journey. Your daily action plan is ready.
          </p>
          <GlowButton
            type="button"
            className="mt-auto rounded-xl w-full sm:w-auto"
            onClick={() => router.push(`/journey/${currentDay}`)}
          >
            Go to Day {currentDay}
          </GlowButton>
        </Card>
      </div>

      <section className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h3 className="font-display mb-4 text-base font-bold text-foreground">
            This Week&apos;s Actions
          </h3>
          <div className="space-y-3">
            {actionItems.length > 0 ? (
              actionItems.map((item) => (
                <label
                  key={item.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-4 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/30',
                  )}
                >
                  <Checkbox
                    checked={actionsChecked[item.id]}
                    onCheckedChange={(v) =>
                      setActionsChecked((s) => ({ ...s, [item.id]: Boolean(v) }))
                    }
                    className="mt-1"
                  />
                  <span className="text-sm leading-relaxed text-foreground">{item.label}</span>
                </label>
              ))
            ) : (
              <div className="rounded-xl border border-border/40 bg-card/50 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {currentDay === 1 ? 'Your Day 1 plan is being prepared. Check back shortly.' : 'No items found for today.'}
                </p>
                <button 
                  onClick={() => router.push('/journey')}
                  className="mt-4 text-xs font-semibold text-primary hover:underline"
                >
                  View Journey
                </button>
              </div>
            )}
            {actionItems.length > 0 && (
               <p className="mt-4 text-center text-xs text-muted-foreground">
                 Items extracted from your Day {currentDay} strategy.
               </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-display mb-4 text-base font-bold text-foreground">
            Your Progress
          </h3>
          <Card className="rounded-2xl border-border/60 bg-card p-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Plan completion</p>
                <p className="mt-1 font-display text-3xl font-bold text-primary">{progress.percent}%</p>
              </div>
              <p className="text-xs font-semibold text-muted-foreground pb-1">
                Day {currentDay} of 90
              </p>
            </div>
            
            <Progress value={progress.percent} className="mt-6 h-2" />
            
            <div className="mt-6 space-y-2 border-t border-border/40 pt-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Days completed</span>
                <span className="font-bold text-foreground">{progress.completed}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Days remaining</span>
                <span className="font-bold text-foreground">{90 - progress.completed}</span>
              </div>
            </div>

            <p className="mt-6 text-xs italic leading-relaxed text-muted-foreground/80">
              Each day you complete brings you closer to your revenue goal. Keep up the momentum!
            </p>
          </Card>
        </div>
      </section>
    </div>
  )
}
