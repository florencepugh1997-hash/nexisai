'use client'

import { use, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, Loader2, Lock, Star } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { getDayPlanData, updatePlanFirstOpened, unlockDayPlan } from '@/app/actions/plans'
import { GlowButton } from '@/components/glow-button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { getTrialStatus } from '@/lib/trial-logic'

export default function DailyPlanPage({ params }: { params: Promise<{ day: string }> }) {
  const router = useRouter()
  const { day } = use(params)
  const dayNumber = parseInt(day, 10)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)

  const [timeLeft, setTimeLeft] = useState<{ hours: number, minutes: number, seconds: number } | null>(null)
  const [isFormUnlocked, setIsFormUnlocked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingDay1, setIsGeneratingDay1] = useState(false)
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null)
  const [showRetry, setShowRetry] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [nextUnlockAt, setNextUnlockAt] = useState<string | null>(null)
  const [unlockTimeLeft, setUnlockTimeLeft] = useState<{ hours: number, minutes: number, seconds: number } | null>(null)
  const [isUnlocking, setIsUnlocking] = useState(false)

  const [trialStatus, setTrialStatus] = useState<{ isExpired: boolean, isSubscribed: boolean, hasFullAccess: boolean } | null>(null)
  const [isReadOnly, setIsReadOnly] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    completed_main_task: '',
    what_i_did: '',
    results_noticed: '',
    blockers: '',
    confidence_rating: 0,
    help_needed_tomorrow: ''
  })

  // Loading Refs to prevent duplicate calls
  const isPollingRef = useRef(false)
  const hasTriggeredGenerationRef = useRef(false)

  useEffect(() => {
    if (isNaN(dayNumber) || dayNumber < 1) {
      router.replace('/journey')
      return
    }

    // Reset refs on day change
    isPollingRef.current = false
    hasTriggeredGenerationRef.current = false

    ;(async () => {
      const session = await import('next-auth/react').then(m => m.getSession())

      if (!session?.user?.id) {
      router.push('/signin')
      return
    }

    try {
      const result = await getDayPlanData(dayNumber)
      if (result.error || !result.data) {
         setError(result.error || 'Failed to load daily plan')
         setLoading(false)
         return
      }

      const { plan: planData, profile: profileData, submission: subData, growthPlan } = result.data
      const tStatus = getTrialStatus(profileData)
      setTrialStatus(tStatus)

      if (!planData) {
          if (tStatus.isExpired && !tStatus.isSubscribed) {
            setError('Your free trial has ended. Subscribe to unlock this day.')
            setLoading(false)
            return
          }

          if (dayNumber === 1) {
            setIsGeneratingDay1(true)
            setPollingStartTime(Date.now())

            if (!growthPlan) {
              setLoading(false)
              setIsGeneratingDay1(false)
              setError('No growth plan found. Please complete onboarding first.')
              return
            }

            // Trigger generation and stream
            if (!hasTriggeredGenerationRef.current) {
              hasTriggeredGenerationRef.current = true

              const startStream = async () => {
                try {
                  const res = await fetch('/api/generate-daily-plan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      growth_plan_id: growthPlan.id
                    })
                  });

                  if (!res.ok) throw new Error('Failed to generate daily plan');
                  if (!res.body) throw new Error('No readable stream available');

                  setIsGeneratingDay1(false);
                  setLoading(false);
                  setShowRetry(false);

                  const nowStr = new Date().toISOString()
                  const activePlan = {
                    id: 'temp-' + Date.now(),
                    content: '',
                    is_unlocked: true,
                    first_opened_at: nowStr
                  };

                  setPlan({ ...activePlan });
                  updateTimer(nowStr);

                  const reader = res.body.getReader();
                  const decoder = new TextDecoder('utf-8');

                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    activePlan.content += chunk;

                    // Force UI update
                    setPlan({ ...activePlan });
                  }

                } catch (err) {
                  console.error(err);
                  setError('Generation failed. Please refresh the page.');
                  setShowRetry(true);
                  hasTriggeredGenerationRef.current = false;
                }
              };

              startStream();
            }

            return // skip the rest of the effect, stream handles it
          } else {
            setError('This day is not available or locked.')
            setLoading(false)
            return
          }
        }

        let currentPlan = planData
        const hasBeenOpened = !!currentPlan.first_opened_at

        if (tStatus.isExpired && !tStatus.isSubscribed) {
          if (hasBeenOpened) {
            setIsReadOnly(true)
          } else {
            setError('Your free trial has ended. Subscribe to unlock this day.')
            setLoading(false)
            return
          }
        }

        if (!currentPlan.is_unlocked && dayNumber > 1) {
          setError('This day is currently locked. Complete the previous day to unlock.')
          setLoading(false)
          return
        }

        if (!currentPlan.is_unlocked && dayNumber === 1) {
          currentPlan.is_unlocked = true
          await unlockDayPlan(currentPlan.id)
        }

        if (!currentPlan.first_opened_at) {
          const updateRes = await updatePlanFirstOpened(currentPlan.id)
          if (updateRes.success) {
            currentPlan.first_opened_at = updateRes.first_opened_at as any
          } else {
            currentPlan.first_opened_at = new Date() as any
          }
        } else {
          const openedAt = new Date(currentPlan.first_opened_at).getTime()
          const now = Date.now()
          if (now >= openedAt + (16 * 60 * 60 * 1000)) {
            fetch('/api/unlock-next-day', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ current_day_number: dayNumber })
            }).catch(console.error)
          } else {
            // Plan is locked for the next day, set nextUnlockAt
            setNextUnlockAt(new Date(openedAt + (16 * 60 * 60 * 1000)).toISOString())
          }
        }

        setPlan(currentPlan)

        if (subData) {
          setSubmission(subData)
        }
        // Form is always unlocked once the plan is open
        setIsFormUnlocked(true)
        setLoading(false)
        return

      } catch (err) {
        console.error(err)
        setError('Failed to load daily plan')
      } finally {
        setLoading(false)
      }
    })()
  }, [dayNumber, router])

  // Countdown effect for nextUnlockAt
  useEffect(() => {
    if (!nextUnlockAt) return

    const interval = setInterval(() => {
      const diffMs = new Date(nextUnlockAt).getTime() - new Date().getTime();
      if (diffMs <= 0) {
        setNextUnlockAt(null);
        setUnlockTimeLeft(null);
        clearInterval(interval);
        handleNextDay();
      } else {
        const h = Math.floor(diffMs / (1000 * 60 * 60));
        const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diffMs % (1000 * 60)) / 1000);
        setUnlockTimeLeft({ hours: h, minutes: m, seconds: s });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextUnlockAt])


  const updateTimer = (openedAtIso: string) => {
    const openedAt = new Date(openedAtIso).getTime()
    const now = new Date().getTime()
    const diffMs = now - openedAt
    const hoursElapsed = diffMs / (1000 * 60 * 60)

    if (hoursElapsed >= 6) {
      setIsFormUnlocked(true)
      setTimeLeft(null)
    } else {
      const msRemaining = (6 * 60 * 60 * 1000) - diffMs
      const h = Math.floor(msRemaining / (1000 * 60 * 60))
      const m = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((msRemaining % (1000 * 60)) / 1000)
      setTimeLeft({ hours: h, minutes: m, seconds: s })
      setIsFormUnlocked(false)
    }
  }

  const handleRetryGeneration = async () => {
    setShowRetry(false)
    const now = Date.now()
    setPollingStartTime(now)
      ; (window as any)._pollingStart = now

    const result = await getDayPlanData(1)
    const growthPlan = result.data?.growthPlan

    if (growthPlan) {
      fetch('/api/generate-daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          growth_plan_id: growthPlan.id
        })
      }).catch(console.error)
    }
  }

  const handleNextDay = async () => {
    setIsUnlocking(true)
    try {
      const res = await fetch('/api/unlock-next-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_day_number: dayNumber })
      })
      const data = await res.json()

      if (data.unlocked) {
        router.push(`/journey/${dayNumber + 1}`)
      } else if (data.next_unlock_at) {
        setNextUnlockAt(data.next_unlock_at)
        // start countdown logic handled by effect
      } else {
        alert(data.reason || 'Cannot unlock next day yet.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/submit-daily-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_number: dayNumber,
          ...formData
        })
      })

      if (res.ok) {
        setSubmission({ ...formData, day_number: dayNumber })
        // Wait a slight moment then navigate or show success
        setTimeout(() => {
          handleNextDay()
        }, 1500)
      } else {
        const errData = await res.json().catch(() => ({}))
        setSubmitError(errData?.error || 'Failed to submit form.')
      }
    } catch (err: any) {
      console.error(err)
      setSubmitError(err?.message || 'An error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || isGeneratingDay1) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-6 px-6 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary/80" strokeWidth={1.5} />
        {isGeneratingDay1 ? (
          <div className="space-y-4 animate-pulse flex flex-col items-center">
            <p className="text-lg font-display font-bold text-foreground">
              {showRetry ? "Taking longer than expected..." : "Your Day 1 plan is being prepared..."}
            </p>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              {showRetry
                ? "The AI model might be busy. Please tap to retry the generation."
                : "This usually takes 1-2 minutes. It will appear automatically when ready."}
            </p>
            {showRetry && (
              <GlowButton onClick={handleRetryGeneration} className="mt-2 rounded-xl px-8">
                Tap to retry
              </GlowButton>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}
      </div>
    )
  }

  if (error || !plan) {
    const isMissingPlan = error === 'No growth plan found. Please complete onboarding first.'
    const isPaywalled = error === 'Your free trial has ended. Subscribe to unlock this day.'
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-20 text-center">
        <p className="text-muted-foreground">{error}</p>
        <Link
          href={isMissingPlan ? "/onboarding" : isPaywalled ? "/upgrade" : "/journey"}
          className="text-primary hover:underline"
        >
          {isMissingPlan ? "Complete Onboarding" : isPaywalled ? "Upgrade to Pro" : "Back to Journey"}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-20">
      <div>
        <Link href="/journey" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to Journey
        </Link>
      </div>

      <article className="prose prose-invert prose-emerald max-w-none">
        {plan.content.split('\n\n').map((paragraph: string, idx: number) => {
          const rawText = paragraph.trim()
          if (!rawText) return null

          let cleanText = rawText
          let isHeader = false

          // Strip leading '#' for markdown headers
          const headerMatch = cleanText.match(/^(#{1,6})\s+(.*)/)
          if (headerMatch) {
            isHeader = true
            cleanText = headerMatch[2]
          }

          // Strip surrounding bold markers if the entire line is bolded (common for AI headers)
          const boldMatch = cleanText.match(/^\*\*(.*)\*\*$/)
          if (boldMatch) {
            cleanText = boldMatch[1]
          }

          // Heuristic: ALL CAPS short sentences are likely headers even without '#'
          if (!isHeader && cleanText.match(/^[A-Z0-9\s—:\-]+$/i) && cleanText === cleanText.toUpperCase() && cleanText.length < 100 && cleanText.match(/[A-Z]/)) {
            isHeader = true
          }

          if (isHeader) {
            if (cleanText.toUpperCase().startsWith(`DAY ${dayNumber}`)) {
              return <h1 key={idx} className="font-display mb-8 text-3xl font-bold text-primary">{cleanText}</h1>
            }
            return <h2 key={idx} className="font-display mt-8 text-xl font-bold text-foreground">{cleanText}</h2>
          }

          // Simple inline bold formatting for paragraphs
          const parts = cleanText.split(/(\*\*.*?\*\*)/g)

          return (
            <p key={idx} className="text-muted-foreground leading-relaxed">
              {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>
                }
                return part
              })}
            </p>
          )
        })}
      </article>

      <div className="mt-16 border-t border-border/50 pt-10">
        <h3 className="font-display mb-6 text-2xl font-bold">How did Day {dayNumber} go?</h3>

        {submission ? (
          <Card className="rounded-2xl border-primary/25 bg-card p-8 text-center space-y-4 shadow-sm">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
              <Check className="h-6 w-6" />
            </div>
            <h4 className="font-display text-xl font-semibold text-primary">Feedback Submitted Successfully ✓</h4>
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Your feedback has been recorded and will be used by our AI to tailor and make plans for your next day.
              </p>
              <p className="text-sm text-foreground/80 font-medium">
                The next day will be available after some time in order to make sure today's plan is completely internalized and executed.
              </p>
            </div>

            {nextUnlockAt && unlockTimeLeft ? (
              <div className="mt-6 flex flex-col items-center space-y-3">
                <div className="rounded-xl bg-background border border-border/50 px-6 py-3 w-full max-w-sm">
                  <p className="text-sm font-medium text-muted-foreground">Next Day unlocks in</p>
                  <p className="text-2xl font-bold font-display text-primary mt-1">
                    {unlockTimeLeft.hours}h {unlockTimeLeft.minutes}m {unlockTimeLeft.seconds}s
                  </p>
                </div>
                {!trialStatus?.isSubscribed && (
                  <Link href="/upgrade" className="inline-flex rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20">
                    Skip the wait — Go Pro
                  </Link>
                )}
              </div>
            ) : (
              <GlowButton type="button" onClick={handleNextDay} disabled={isUnlocking} className="mt-4 glow-primary">
                {isUnlocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> : null}
                Unlock Next Day
              </GlowButton>
            )}
          </Card>
        ) : isReadOnly ? (
          <Card className="flex flex-col items-center justify-center space-y-3 rounded-2xl border-destructive/20 bg-card p-8 text-center shadow-sm">
            <Lock className="h-8 w-8 text-destructive mb-2" />
            <p className="text-muted-foreground font-medium">Subscribe to Nexis Pro to submit your progress and unlock new days</p>
            <GlowButton type="button" onClick={() => router.push('/upgrade')} className="mt-4 rounded-xl px-6">
              Subscribe Now
            </GlowButton>
          </Card>
        ) : !isFormUnlocked ? (
          <Card className="flex flex-col items-center justify-center space-y-3 rounded-2xl border-primary/20 bg-card p-8 text-center">
            <Lock className="h-8 w-8 text-muted-foreground opacity-50 mb-2" />
            <p className="text-muted-foreground">Internalize today's plan and take action.</p>
            <p className="font-medium text-foreground">
              Submission form unlocks in <span className="text-primary">{timeLeft?.hours}h {timeLeft?.minutes}m {timeLeft?.seconds}s</span>
            </p>
          </Card>
        ) : (
          <>
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-yellow-400">Before you fill this form</p>
                <p className="mt-1 text-xs text-yellow-300/80">
                  Make sure you have actually completed Day {dayNumber}&apos;s tasks first. This form is a reflection of real actions you took today — not a plan for what you&apos;ll do. Only submit once you&apos;ve done the work.
                </p>
              </div>
            </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base text-foreground">Did you complete today's main task?</Label>
              <div className="flex gap-3">
                {['Yes', 'Partially', 'No'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData(s => ({ ...s, completed_main_task: opt }))}
                    className={cn(
                      "flex-1 rounded-xl border p-3 text-sm font-medium transition-colors",
                      formData.completed_main_task === opt
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 bg-transparent text-muted-foreground hover:bg-card hover:border-border'
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base text-foreground">What did you actually do today?</Label>
              <p className="text-xs text-muted-foreground pb-1">Be specific. What actions did you take?</p>
              <textarea
                required
                value={formData.what_i_did}
                onChange={(e) => setFormData(s => ({ ...s, what_i_did: e.target.value }))}
                className="min-h-[100px] w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                placeholder="I spent 45 minutes redesigning the landing page hero section..."
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base text-foreground">What results or responses did you notice?</Label>
              <textarea
                value={formData.results_noticed}
                onChange={(e) => setFormData(s => ({ ...s, results_noticed: e.target.value }))}
                className="min-h-[80px] w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none resize-none"
                placeholder="(Optional) Got 2 new leads, 5 likes on the post..."
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base text-foreground">What slowed you down or blocked you?</Label>
              <textarea
                value={formData.blockers}
                onChange={(e) => setFormData(s => ({ ...s, blockers: e.target.value }))}
                className="min-h-[80px] w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground focus:border-destructive/50 focus:outline-none focus:ring-1 focus:ring-destructive/50 resize-none"
                placeholder="(Optional) I wasn't sure what tool to use..."
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base text-foreground">How confident do you feel about your progress?</Label>
              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData(s => ({ ...s, confidence_rating: star }))}
                    className="focus:outline-none group"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        (formData.confidence_rating || 0) >= star
                          ? "fill-primary text-primary"
                          : "fill-transparent text-muted-foreground group-hover:text-primary/50"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base text-foreground">What do you need help with tomorrow?</Label>
              <textarea
                value={formData.help_needed_tomorrow}
                onChange={(e) => setFormData(s => ({ ...s, help_needed_tomorrow: e.target.value }))}
                className="min-h-[80px] w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none resize-none"
                placeholder="(Optional) I need help writing the email hook..."
              />
            </div>

            {submitError && (
              <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 text-center">
                {submitError}
              </div>
            )}

            <GlowButton
              type="submit"
              className="w-full rounded-xl glow-primary"
              disabled={isSubmitting || !formData.completed_main_task || formData.what_i_did.trim() === ''}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                `Submit Feedback`
              )}
            </GlowButton>
          </form>
          </>
        )}
      </div>
    </div>
  )
}
