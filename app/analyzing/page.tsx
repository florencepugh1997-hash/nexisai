'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNexisUser } from '@/contexts/nexis-user-context'
import { supabase } from '@/lib/supabase'
import { GlowButton } from '@/components/glow-button'
import { cn } from '@/lib/utils'

const MESSAGES = [
  'Analyzing your business profile…',
  'Building your 90-day strategy…',
  'Almost ready…',
]

const ROTATE_MS = 3000

export default function AnalyzingPage() {
  const router = useRouter()
  const { hydrated } = useNexisUser()
  const [i, setI] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [almostThere, setAlmostThere] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!hydrated) return

    intervalRef.current = setInterval(() => {
      setI((x) => (x + 1) % MESSAGES.length)
    }, ROTATE_MS)

    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return

    const ac = new AbortController()
    setAlmostThere(false)

    // Show "Almost there…" after 30 seconds
    const almostThereTimer = setTimeout(() => {
      if (!ac.signal.aborted) setAlmostThere(true)
    }, 30_000)

    ;(async () => {
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (ac.signal.aborted) return
      if (!session?.user?.id) {
        router.replace('/signin')
        return
      }

      const userId = session.user.id

      // Fetch business profile for this user
      const { data: profile, error: profileError } = await supabase
        .from('business_profiles')
        .select(
          'business_name, industry, description, current_stage, target_audience, biggest_challenge, current_channels, monthly_budget, revenue_goal',
        )
        .eq('user_id', userId)
        .single()

      if (ac.signal.aborted) return

      if (profileError || !profile) {
        setError(
          profileError?.message ?? 'Could not load your business profile. Please try again.',
        )
        return
      }

      // Call the Claude API route
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: profile.business_name,
          industry: profile.industry,
          description: profile.description,
          current_stage: profile.current_stage,
          target_audience: profile.target_audience,
          biggest_challenge: profile.biggest_challenge,
          current_channels: profile.current_channels,
          monthly_budget: profile.monthly_budget,
          revenue_goal: profile.revenue_goal,
        }),
        signal: ac.signal,
      })

      if (ac.signal.aborted) return

      const json = await res.json()

      if (!res.ok) {
        setError(json?.error ?? `API error (${res.status}). Please try again.`)
        return
      }

      const plan: string = json.plan

      // Mark any existing plans as no longer current
      await supabase
        .from('growth_plans')
        .update({ is_current: false })
        .eq('user_id', userId)

      // Save the new plan
      const { data: insertedPlan, error: insertError } = await supabase
        .from('growth_plans')
        .insert({ user_id: userId, content: plan, is_current: true })
        .select('id')
        .single()

      if (ac.signal.aborted) return

      if (insertError || !insertedPlan) {
        setError(insertError?.message || 'Failed to save growth plan')
        return
      }

      // Fire and forget - don't await
      fetch('/api/generate-daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: userId, 
          day_number: 1, 
          growth_plan_id: insertedPlan.id 
        })
      }).catch(err => console.error('Failed background day 1 generation', err))

      router.push('/dashboard')
    })().catch((err) => {
      if (ac.signal.aborted || err?.name === 'AbortError') return
      setError(err?.message ?? 'Something went wrong. Please try again.')
    })

    return () => {
      ac.abort()
      clearTimeout(almostThereTimer)
    }
  }, [hydrated, router, attempt])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="relative flex h-36 w-36 items-center justify-center">
        <div
          className={cn(
            'absolute inset-0 rounded-full border-2 border-primary/25',
            'animate-ping opacity-40',
          )}
          style={{ animationDuration: '2s' }}
        />
        <div
          className={cn(
            'absolute inset-2 rounded-full border-2 border-transparent border-t-primary border-r-primary',
            error ? '' : 'animate-spin',
          )}
          style={{ animationDuration: '1.2s' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_24px_rgba(0,232,135,0.8)]" />
        </div>
      </div>

      {error ? (
        <>
          <p className="mt-10 max-w-md text-center text-sm text-destructive" role="alert">
            {error}
          </p>
          <GlowButton
            type="button"
            className="mt-6 rounded-xl"
            onClick={() => {
              setError(null)
              setAttempt((a) => a + 1)
            }}
          >
            Retry
          </GlowButton>
        </>
      ) : (
        <>
          <p
            key={almostThere ? 'almost' : i}
            className="mt-10 max-w-sm text-center font-display text-lg font-semibold text-foreground transition-opacity duration-300"
          >
            {almostThere
              ? 'Almost there, your strategy is being finalized…'
              : MESSAGES[i]}
          </p>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Nexis is synthesizing your answers into an actionable plan.
          </p>
          <p className="mt-2 text-center text-xs italic text-muted-foreground/80">
            This usually takes 2–3 minutes. Please don't close this page.
          </p>
        </>
      )}
    </div>
  )
}
