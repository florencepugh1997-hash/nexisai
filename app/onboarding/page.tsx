'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlowButton } from '@/components/glow-button'
import { GlowInput } from '@/components/glow-input'
import { BackArrow } from '@/components/app/back-arrow'
import { Textarea } from '@/components/ui/textarea'
import { useNexisUser } from '@/contexts/nexis-user-context'
import type { GrowthStage } from '@/lib/nexis-storage'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

const industries = [
  'Technology',
  'E-commerce',
  'Healthcare',
  'Finance',
  'Retail',
  'SaaS',
  'Services',
  'Other',
]

const budgets = [
  'Under $500',
  '$500 – $2,000',
  '$2,000 – $5,000',
  '$5,000 – $10,000',
  '$10,000+',
]

const channelsList = [
  'Instagram',
  'TikTok',
  'Twitter/X',
  'LinkedIn',
  'Email',
  'WhatsApp',
  'None',
] as const

function stageLabel(stage: GrowthStage): string {
  const labels: Record<GrowthStage, string> = {
    early: 'Early',
    growing: 'Growing',
    scaling: 'Scaling',
  }
  return labels[stage]
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, hydrated, updateUser, saveUser } = useNexisUser()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('')
  const [businessDescription, setBusinessDescription] = useState('')
  const [stage, setStage] = useState<GrowthStage | ''>('')
  const [targetAudience, setTargetAudience] = useState('')
  const [biggestChallenge, setBiggestChallenge] = useState('')
  const [marketingChannels, setMarketingChannels] = useState<string[]>([])
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [revenueGoal, setRevenueGoal] = useState('')

  useEffect(() => {
    if (!hydrated) return
    let cancelled = false
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) {
        router.replace('/signin')
        return
      }
      if (!user?.email) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, trial_start_date')
          .eq('id', session.user.id)
          .maybeSingle()
        if (cancelled) return
        saveUser({
          fullName:
            profile?.full_name ??
            (session.user.user_metadata?.full_name as string | undefined) ??
            'User',
          email: session.user.email ?? '',
          trialStartedAt:
            profile?.trial_start_date ?? new Date().toISOString(),
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hydrated, user?.email, router, saveUser])

  const toggleChannel = (c: string) => {
    if (c === 'None') {
      setMarketingChannels((prev) => (prev.includes('None') ? [] : ['None']))
      return
    }
    setMarketingChannels((prev) => {
      const withoutNone = prev.filter((x) => x !== 'None')
      if (withoutNone.includes(c))
        return withoutNone.filter((x) => x !== c)
      return [...withoutNone, c]
    })
  }

  const stepValid = () => {
    if (step === 1)
      return (
        businessName.trim().length > 0 &&
        industry.length > 0 &&
        businessDescription.trim().length > 0
      )
    if (step === 2)
      return (
        stage !== '' &&
        targetAudience.trim().length > 0 &&
        biggestChallenge.trim().length > 0
      )
    return (
      marketingChannels.length > 0 &&
      monthlyBudget.length > 0 &&
      revenueGoal.trim().length > 0
    )
  }

  const handleContinue = async () => {
    setSubmitError(null)
    if (step < 3) {
      setStep((s) => s + 1)
      return
    }
    if (!stepValid()) return

    setLoading(true)

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      setSubmitError(authError?.message ?? 'You must be signed in to continue.')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('business_profiles').insert({
      user_id: authUser.id,
      business_name: businessName.trim(),
      industry,
      description: businessDescription.trim(),
      current_stage: stageLabel(stage as GrowthStage),
      target_audience: targetAudience.trim(),
      biggest_challenge: biggestChallenge.trim(),
      current_channels: marketingChannels,
      monthly_budget: monthlyBudget,
      revenue_goal: revenueGoal.trim(),
    })

    if (insertError) {
      setSubmitError(insertError.message)
      setLoading(false)
      return
    }

    updateUser({
      businessName: businessName.trim(),
      industry,
      businessDescription: businessDescription.trim(),
      stage: stage as GrowthStage,
      targetAudience: targetAudience.trim(),
      biggestChallenge: biggestChallenge.trim(),
      marketingChannels,
      monthlyBudget,
      revenueGoal: revenueGoal.trim(),
    })

    setLoading(false)
    router.push('/analyzing')
  }

  const handleBack = () => {
    setSubmitError(null)
    if (step <= 1) {
      router.push('/signin')
      return
    }
    setStep((s) => s - 1)
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <BackArrow href="/signin" />
          )}
        </div>

        <div className="mb-8 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                s <= step ? 'bg-primary' : 'bg-border',
              )}
            />
          ))}
        </div>
        <p className="mb-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Step {step} of 3
        </p>

        {step === 1 && (
          <div className="space-y-5">
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Tell us about your business
            </h1>
            <GlowInput
              label="Business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Acme Studio"
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Industry
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-input px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/35"
              >
                <option value="">Select industry</option>
                {industries.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                What does your business do?
              </label>
              <Textarea
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder="We help small brands grow through content and paid ads…"
                className="min-h-28 rounded-xl border-border/60 bg-input"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Where are you today?
            </h1>
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">
                Current stage
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    { id: 'early' as const, title: 'Early', sub: 'Idea / MVP' },
                    { id: 'growing' as const, title: 'Growing', sub: 'Traction' },
                    { id: 'scaling' as const, title: 'Scaling', sub: 'Systems' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStage(opt.id)}
                    className={cn(
                      'rounded-xl border px-3 py-4 text-left transition-colors',
                      stage === opt.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 bg-card hover:border-primary/35',
                    )}
                  >
                    <p className="font-display text-sm font-bold text-foreground">
                      {opt.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>
            <GlowInput
              label="Target audience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. B2B SaaS founders, 10–200 employees"
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Biggest challenge right now
              </label>
              <Textarea
                value={biggestChallenge}
                onChange={(e) => setBiggestChallenge(e.target.value)}
                placeholder="Lead generation, retention, positioning…"
                className="min-h-24 rounded-xl border-border/60 bg-input"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Marketing & goals
            </h1>
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">
                Marketing channels
              </p>
              <div className="flex flex-wrap gap-2">
                {channelsList.map((c) => {
                  const on = marketingChannels.includes(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleChannel(c)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                        on
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-border/60 text-muted-foreground hover:border-primary/35',
                      )}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Monthly marketing budget
              </label>
              <select
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-input px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/35"
              >
                <option value="">Select range</option>
                {budgets.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <GlowInput
              label="Revenue goal"
              value={revenueGoal}
              onChange={(e) => setRevenueGoal(e.target.value)}
              placeholder="e.g. $20K MRR in 6 months"
            />
          </div>
        )}

        {submitError ? (
          <p className="mt-6 text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}

        <GlowButton
          type="button"
          size="lg"
          className="mt-10 w-full rounded-xl"
          disabled={!stepValid()}
          loading={loading}
          onClick={handleContinue}
        >
          {loading && step === 3 ? 'Saving...' : 'Continue'}
        </GlowButton>
      </div>
    </div>
  )
}
