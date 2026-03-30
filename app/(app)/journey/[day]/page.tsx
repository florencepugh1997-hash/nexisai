'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, Loader2, Lock, Star } from 'lucide-react'
import Link from 'next/link'
import { useNexisUser } from '@/contexts/nexis-user-context'
import { supabase } from '@/lib/supabase'
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

  useEffect(() => {
    if (isNaN(dayNumber) || dayNumber < 1) {
      router.replace('/journey')
      return
    }

    if (nextUnlockAt) {
      const interval = setInterval(() => {
        const diffMs = new Date(nextUnlockAt).getTime() - new Date().getTime();
        if (diffMs <= 0) {
          setNextUnlockAt(null);
          setUnlockTimeLeft(null);
          clearInterval(interval);
          // Auto unlock when countdown completes
          handleNextDay();
        } else {
          const h = Math.floor(diffMs / (1000 * 60 * 60));
          const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diffMs % (1000 * 60)) / 1000);
          setUnlockTimeLeft({ hours: h, minutes: m, seconds: s });
        }
      }, 1000);
      return () => clearInterval(interval);
    }

    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) {
        router.push('/signin')
        return
      }
      
      try {
        const [planRes, profileRes] = await Promise.all([
          supabase.from('daily_plans').select('*').eq('user_id', authUser.id).eq('day_number', dayNumber).maybeSingle(),
          supabase.from('profiles').select('trial_end_date, is_trial_active, is_subscribed').eq('id', authUser.id).maybeSingle()
        ])
        
        const planData = planRes.data
        const planError = planRes.error
        const tStatus = getTrialStatus(profileRes.data)
        setTrialStatus(tStatus)
          
        if (planError || !planData) {
          if (tStatus.isExpired && !tStatus.isSubscribed) {
            setError('Your free trial has ended. Subscribe to unlock this day.')
            setLoading(false)
            return
          }

          if (dayNumber === 1) {
            setIsGeneratingDay1(true)
            
            const { data: growthPlan } = await supabase
              .from('growth_plans')
              .select('id')
              .eq('user_id', authUser.id)
              .eq('is_current', true)
              .maybeSingle()
            
            if (!growthPlan) {
              setLoading(false)
              setIsGeneratingDay1(false)
              setError('No growth plan found. Please complete onboarding first.')
              return
            }

            // Trigger generation
            fetch('/api/generate-daily-plan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                user_id: authUser.id, 
                day_number: 1,
                growth_plan_id: growthPlan.id
              })
            }).catch(console.error)
            
            // Poll every 3 seconds
            const poll = async () => {
              const { data: newPlan } = await supabase
                .from('daily_plans')
                .select('*')
                .eq('user_id', authUser.id)
                .eq('day_number', dayNumber)
                .maybeSingle()
                
              if (newPlan?.content) {
                if (!newPlan.is_unlocked) {
                  newPlan.is_unlocked = true
                  await supabase.from('daily_plans').update({ is_unlocked: true }).eq('id', newPlan.id)
                }
                
                if (!newPlan.first_opened_at) {
                  const nowStr = new Date().toISOString()
                  await supabase.from('daily_plans').update({ first_opened_at: nowStr }).eq('id', newPlan.id)
                  newPlan.first_opened_at = nowStr
                }
                
                setPlan(newPlan)
                updateTimer(newPlan.first_opened_at)
                setIsGeneratingDay1(false)
                setLoading(false)
              } else {
                setTimeout(poll, 3000)
              }
            }
            poll()
            return // skip the rest of the effect, polling handles it
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
           await supabase.from('daily_plans').update({ is_unlocked: true }).eq('id', currentPlan.id)
        }
        
        if (!currentPlan.first_opened_at) {
          const nowStr = new Date().toISOString()
          await supabase
            .from('daily_plans')
            .update({ first_opened_at: nowStr })
            .eq('id', currentPlan.id)
            
          currentPlan.first_opened_at = nowStr
        } else {
          const openedAt = new Date(currentPlan.first_opened_at).getTime()
          const now = Date.now()
          if (now >= openedAt + (16 * 60 * 60 * 1000)) {
            fetch('/api/unlock-next-day', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: authUser.id, current_day_number: dayNumber })
            }).catch(console.error)
          }
        }
        
        setPlan(currentPlan)
        
        const { data: subData } = await supabase
          .from('daily_submissions')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('day_number', dayNumber)
          .maybeSingle()
          
        if (subData) {
          setSubmission(subData)
          setIsFormUnlocked(true)
        } else {
          updateTimer(currentPlan.first_opened_at)
          const timerInterval = setInterval(() => updateTimer(currentPlan.first_opened_at), 1000)
          setLoading(false)
          return () => clearInterval(timerInterval)
        }
        
      } catch (err) {
        console.error(err)
        setError('Failed to load daily plan')
      } finally {
        setLoading(false)
      }
    })
  }, [dayNumber, router, nextUnlockAt])

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

  const handleNextDay = async () => {
    setIsUnlocking(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      setIsUnlocking(false)
      return
    }
    
    try {
      const res = await fetch('/api/unlock-next-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: authUser.id, current_day_number: dayNumber })
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
    
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    
    try {
      const res = await fetch('/api/submit-daily-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: authUser.id,
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
          <div className="space-y-2 animate-pulse">
            <p className="text-lg font-display font-bold text-foreground">Your Day 1 plan is being prepared...</p>
            <p className="text-sm text-muted-foreground max-w-[280px]">This usually takes 1-2 minutes. It will appear automatically when ready.</p>
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
            <h4 className="font-display text-xl font-semibold">Submitted ✓</h4>
            <p className="text-muted-foreground">Your progress has been recorded. Keep up the momentum!</p>
            
            {nextUnlockAt && unlockTimeLeft ? (
               <div className="mt-6 flex flex-col items-center space-y-3">
                 <p className="font-medium text-foreground">
                   Next Day unlocks in <span className="text-primary">{unlockTimeLeft.hours}h {unlockTimeLeft.minutes}m {unlockTimeLeft.seconds}s</span>
                 </p>
                 <Link href="/upgrade" className="inline-flex rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20">
                   Skip the wait — Go Pro
                 </Link>
               </div>
            ) : (
               <GlowButton type="button" onClick={handleNextDay} disabled={isUnlocking} className="mt-4">
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
               <p className="text-xs text-muted-foreground pb-1">Be specific. What actions did you take? (min 50 characters)</p>
               <textarea 
                 required
                 minLength={50}
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
               className="w-full rounded-xl"
               disabled={isSubmitting || !formData.completed_main_task || formData.what_i_did.length < 50}
             >
               {isSubmitting ? (
                 <span className="flex items-center gap-2">
                   <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                 </span>
               ) : (
                 `Submit & Unlock Day ${dayNumber + 1}`
               )}
             </GlowButton>
          </form>
        )}
      </div>
    </div>
  )
}
