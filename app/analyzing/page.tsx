'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNexisUser } from '@/contexts/nexis-user-context'

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

      const session = await import('next-auth/react').then(m => m.getSession())
      if (ac.signal.aborted) return
      if (!session?.user?.id) {
        router.replace('/signin')
        return
      }

      const userId = session.user.id

      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ac.signal,
      })

      if (ac.signal.aborted) return

      const json = await res.json()

      if (!res.ok) {
        setError(json?.error ?? `API error (${res.status}). Please try again.`)
        return
      }

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
