'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GlowButton } from '@/components/glow-button'
import { GlowInput } from '@/components/glow-input'
import { BackArrow } from '@/components/app/back-arrow'
import { Card } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const validate = () => {
    if (!email.trim()) { setEmailError('Email is required'); return false }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('Enter a valid email'); return false }
    return true
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setFormError(null)
    if (!validate()) return
    setLoading(true)

    const res = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setFormError(data.error || 'Something went wrong.')
      return
    }

    setSent(true)
    // Navigate to reset page, passing email as query param
    setTimeout(() => {
      router.push(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`)
    }, 1500)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col justify-center">
        <BackArrow href="/signin" className="mb-8 self-start" />

        <Card className="rounded-2xl border-border/60 bg-card p-6 sm:p-8">
          {/* Icon */}
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Forgot password?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a 6-digit code to reset your password.
          </p>

          {sent ? (
            <div className="mt-8 rounded-xl border border-primary/30 bg-primary/10 p-4 text-center">
              <p className="text-sm font-medium text-primary">✓ Code sent! Redirecting…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <GlowInput
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError('')
                  if (formError) setFormError(null)
                }}
                error={emailError}
                placeholder="you@company.com"
              />

              {formError && (
                <p className="text-sm text-destructive" role="alert">{formError}</p>
              )}

              <GlowButton
                type="submit"
                size="lg"
                loading={loading}
                className="mt-4 w-full rounded-xl"
              >
                {loading ? 'Sending code...' : 'Send Reset Code'}
              </GlowButton>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it?{' '}
            <Link href="/signin" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
