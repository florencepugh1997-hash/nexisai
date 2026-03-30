'use client'

import React, { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { Lock } from 'lucide-react'
import { useNexisUser } from '@/contexts/nexis-user-context'
import { supabase } from '@/lib/supabase'
import { GlowButton } from '@/components/glow-button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getTrialStatus } from '@/lib/trial-logic'

// ---------------------------------------------------------------------------
// Section matcher — maps heading keywords to card indices (0-based)
// ---------------------------------------------------------------------------
const SECTION_MATCHERS: { pattern: RegExp; index: number }[] = [
  { pattern: /BUSINESS\s+SNAPSHOT/i,        index: 0 },
  { pattern: /HOLDING\s+YOU\s+BACK|WHAT.S\s+HOLDING/i, index: 1 },
  { pattern: /PHASE\s*1|FIX\s+THE\s+FOUNDATION/i,      index: 2 },
  { pattern: /PHASE\s*2|BUILD\s+VISIBILITY/i,           index: 3 },
  { pattern: /PHASE\s*3|CONVERT\s*[&+]\s*RETAIN/i,     index: 4 },
  { pattern: /THIS\s+WEEK/i,                            index: 5 },
  { pattern: /MEASURE\s+PROGRESS|HOW\s+TO\s+MEASURE/i, index: 6 },
]

const SECTION_META = [
  { title: 'Business Snapshot',           locked: false },
  { title: "What's Holding You Back",     locked: false },
  { title: 'Phase 1: Fix the Foundation', locked: false },
  { title: 'Phase 2: Build Visibility',   locked: true  },
  { title: 'Phase 3: Convert & Retain',   locked: true  },
  { title: "This Week's Actions",         locked: false },
  { title: 'How to Measure Progress',     locked: false },
]

// ---------------------------------------------------------------------------
// Parse the flat plan string into 7 section strings
// ---------------------------------------------------------------------------
function parsePlanIntoSections(plan: string): string[] {
  const sections: string[] = Array(7).fill('')
  const lines = plan.split('\n')
  let currentIndex: number | null = null

  for (const line of lines) {
    const stripped = line.replace(/^#+\s*/, '').trim()
    const match = SECTION_MATCHERS.find((m) => m.pattern.test(stripped))
    if (match !== undefined) {
      currentIndex = match.index
    } else if (currentIndex !== null) {
      sections[currentIndex] += line + '\n'
    }
  }

  return sections
}

// ---------------------------------------------------------------------------
// Markdown components
// ---------------------------------------------------------------------------
const mdComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-3 font-display text-lg font-bold text-foreground">{children}</h2>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-2 mt-4 font-display text-base font-semibold text-foreground first:mt-0">{children}</h3>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mb-1 mt-3 font-display text-sm font-semibold text-foreground/90">{children}</h4>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 text-sm leading-relaxed text-muted-foreground last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 list-inside list-decimal space-y-1 text-sm text-muted-foreground">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
}

// ---------------------------------------------------------------------------
// Unlocked section card
// ---------------------------------------------------------------------------
function SectionCard({ title, content }: { title: string; content: string }) {
  return (
    <Card className="rounded-2xl border border-border/60 bg-card">
      <div className="px-5 py-4 sm:px-6">
        <p className="mb-3 font-display text-base font-bold text-foreground">{title}</p>
        <div className="border-t border-border/50 pt-3">
          {content.trim() ? (
            <ReactMarkdown components={mdComponents as never}>{content}</ReactMarkdown>
          ) : (
            <p className="text-sm italic text-muted-foreground">No content available for this section.</p>
          )}
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Locked section card
// ---------------------------------------------------------------------------
function LockedCard({
  title,
  teaser,
  onUnlock,
}: {
  title: string
  teaser: string
  onUnlock: () => void
}) {
  return (
    <Card className="relative overflow-hidden rounded-2xl border border-border/60 bg-card">
      {/* blurred preview */}
      <div className="pointer-events-none select-none px-5 py-4 blur-sm opacity-40 sm:px-6" aria-hidden>
        <p className="mb-2 font-display text-base font-bold text-foreground">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{teaser}</p>
      </div>
      {/* lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 px-6 text-center backdrop-blur-[2px]">
        <Lock className="h-7 w-7 text-primary" strokeWidth={1.5} />
        <p className="text-sm font-medium text-foreground">Subscribe to unlock</p>
        <GlowButton type="button" className="rounded-xl" onClick={onUnlock}>
          View plans
        </GlowButton>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function PlanPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useNexisUser()
  const business = user?.businessName?.trim() || 'Your business'

  const [rawPlan, setRawPlan] = useState<string | null>(null)
  const [planLoading, setPlanLoading] = useState(true)
  const [trialStatus, setTrialStatus] = useState<{ isExpired: boolean, isSubscribed: boolean, hasFullAccess: boolean } | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('subscribed') === '1') {
      setSuccessMsg('Welcome to Nexis Pro! Your full plan is now unlocked.')
      window.history.replaceState({}, '', '/plan')
    }
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled) {
        setPlanLoading(false)
        return
      }
      if (!session?.user?.id) {
        router.push('/signin')
        setPlanLoading(false)
        return
      }

      const userId = session.user.id

      const [planResult, profileResult] = await Promise.all([
        supabase
          .from('growth_plans')
          .select('content')
          .eq('user_id', userId)
          .eq('is_current', true)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('trial_end_date, is_trial_active, is_subscribed')
          .eq('id', userId)
          .maybeSingle(),
      ])

      if (!cancelled) {
        const status = getTrialStatus(profileResult.data)
        setRawPlan(planResult.data?.content ?? null)
        setTrialStatus(status)
        setPlanLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const sections = useMemo(
    () => (rawPlan ? parsePlanIntoSections(rawPlan) : null),
    [rawPlan],
  )

  return (
    <div className="space-y-6 relative">
      {/* Page header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Your 90-Day Growth Plan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{business}</p>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 px-5 py-4 text-sm font-medium text-primary">
          🎉 {successMsg}
        </div>
      )}

      {planLoading ? (
        <p className="text-sm text-muted-foreground">Loading your plan…</p>
      ) : sections && trialStatus ? (
        <div className="space-y-8">
          {trialStatus.isExpired && !trialStatus.isSubscribed && (
            <Card className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden rounded-2xl border-destructive/30 bg-card shadow-sm">
              <div className="flex flex-col gap-2 relative z-10">
                <div className="flex items-center gap-2 text-destructive mb-1">
                  <Lock className="w-5 h-5 shrink-0" strokeWidth={2.5} />
                  <span className="font-bold text-sm tracking-wide uppercase">Trial Expired</span>
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground">Your free trial has ended</h2>
                <p className="text-sm text-muted-foreground max-w-[400px] leading-relaxed">
                  Subscribe to Nexis Pro to keep full access to your 90-day growth plan and execute your daily journey content.
                </p>
              </div>
              <GlowButton onClick={() => router.push('/upgrade')} className="w-full md:w-auto shrink-0 rounded-xl px-8 py-6 text-base font-semibold">
                Subscribe Now
              </GlowButton>
            </Card>
          )}

          <div className={cn("space-y-4", trialStatus.isExpired && !trialStatus.isSubscribed && "pointer-events-none blur-[4px] opacity-40 select-none")}>
            {SECTION_META.map((meta, idx) => {
              const paywallActive = !trialStatus.hasFullAccess;
              
              // If paywall is active (trial not expired but inherently paywalls lower sections)
              const shouldLock = (paywallActive && idx > 1) || (meta.locked && !trialStatus.isSubscribed)

              return shouldLock ? (
                <LockedCard
                  key={idx}
                  title={meta.title}
                  teaser={
                    idx === 3
                      ? 'Channel strategy, content pillars, paid tests, and partnership plays calibrated to your budget and audience.'
                      : idx === 4 
                      ? 'Offer ladders, email sequences, retention loops, and referral mechanics to compound growth.'
                      : 'Subscribe to view this crucial section of your growth plan and unlock the full system.'
                  }
                  onUnlock={() => router.push('/upgrade')}
                />
              ) : (
                <SectionCard
                  key={idx}
                  title={meta.title}
                  content={sections[idx] ?? ''}
                />
              )
            })}
          </div>
        </div>
      ) : (
        <Card className={cn('rounded-2xl border-border/60 bg-card p-5 sm:p-6')}>
          <p className="text-sm text-muted-foreground">
            No plan found. Complete the onboarding questionnaire to generate your personalized growth plan.
          </p>
          <GlowButton
            type="button"
            className="mt-4 rounded-xl"
            onClick={() => router.push('/onboarding')}
          >
            Generate my plan
          </GlowButton>
        </Card>
      )}
    </div>
  )
}

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <PlanPageContent />
    </Suspense>
  )
}
