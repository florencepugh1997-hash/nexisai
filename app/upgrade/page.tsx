'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GlowButton } from '@/components/glow-button'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'


const features = [
  'Full 90-day growth roadmap unlocked',
  'Phase-by-phase playbooks & milestones',
  'Weekly action templates & checklists',
  'Industry benchmarks & competitor angles',
  'Export & share with your team',
  'Priority in-app support',
]

export default function UpgradePage() {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState(false)
  const [cancelMsg, setCancelMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Amount in kobo: $19 = 1900000 kobo (monthly), $15 = 1500000 (annual)
  const amount = billing === 'monthly' ? 1900000 : 18000000 // $15 × 12 months in kobo

  async function handleSubscribe() {
    setLoading(true)
    setCancelMsg(null)
    setErrorMsg(null)

    try {
      // Get current user session
      const session = await import('next-auth/react').then(m => m.getSession())

      if (!session?.user) {
        router.push('/signin')
        return
      }

      const email = session.user.email!
      const userId = session.user.id

      // Dynamically import Paystack to avoid SSR issues
      const PaystackPop = (await import('@paystack/inline-js')).default
      const handler = new PaystackPop()

      handler.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email,
        amount,
        currency: 'NGN',
        label: 'Nexis Pro',
        onSuccess: async (transaction: { reference: string }) => {
          setLoading(true)
          try {
            const res = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference: transaction.reference, userId }),
            })
            const json = await res.json()
            if (!res.ok) {
              setErrorMsg(json?.error ?? 'Payment verification failed. Please contact support.')
              setLoading(false)
              return
            }
            // Success — redirect to plan with full access
            router.push('/plan?subscribed=1')
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Verification failed.'
            setErrorMsg(msg)
            setLoading(false)
          }
        },
        onCancel: () => {
          setCancelMsg('Payment cancelled. Your plan is waiting.')
          setLoading(false)
        },
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setErrorMsg(msg)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Unlock Your Full Growth Plan
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Get complete access to your personalized 90-day strategy
        </p>

        <div className="mt-8 inline-flex rounded-full border border-border/60 bg-card p-1">
          <button
            type="button"
            onClick={() => setBilling('monthly')}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              billing === 'monthly'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Monthly · 19,000 NGN/mo
          </button>
          <button
            type="button"
            onClick={() => setBilling('annual')}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              billing === 'annual'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Annual · 15,000 NGN/mo
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Billed {billing === 'monthly' ? 'monthly' : 'annually'}
        </p>

        <ul className="mt-10 space-y-3 text-left">
          {features.map((f) => (
            <li key={f} className="flex gap-3 text-sm text-foreground">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>

        {cancelMsg && (
          <p className="mt-6 rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">
            {cancelMsg}
          </p>
        )}

        {errorMsg && (
          <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {errorMsg}
          </p>
        )}

        <GlowButton
          type="button"
          size="lg"
          className="glow-primary mt-10 w-full max-w-[400px] rounded-xl"
          onClick={handleSubscribe}
          disabled={loading}
        >
          {loading ? 'Processing…' : 'Subscribe Now'}
        </GlowButton>

        <p className="mt-4 text-xs text-muted-foreground">
          Cancel anytime. No hidden fees.
        </p>

        <Link
          href="/dashboard"
          className="mt-8 inline-block text-sm font-medium text-primary hover:underline"
        >
          Maybe later — back to dashboard
        </Link>
      </div>
    </div>
  )
}
