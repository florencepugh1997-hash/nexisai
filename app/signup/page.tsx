'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GlowButton } from '@/components/glow-button'
import { GlowInput } from '@/components/glow-input'
import { BackArrow } from '@/components/app/back-arrow'
import { useNexisUser } from '@/contexts/nexis-user-context'
import { Card } from '@/components/ui/card'
import { signUpUser } from '@/app/actions/auth'
import { signIn } from 'next-auth/react'

export default function SignUpPage() {
  const router = useRouter()
  const { saveUser } = useNexisUser()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.fullName.trim()) e.fullName = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 8)
      e.password = 'At least 8 characters'
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password'
    else if (form.confirmPassword !== form.password)
      e.confirmPassword = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setFormError(null)
    if (!validate()) return
    setLoading(true)
    const response = await signUpUser({
      email: form.email.trim(),
      password: form.password,
      fullName: form.fullName.trim()
    })

    if (response.error) {
      setFormError(response.error)
      setLoading(false)
      return
    }

    await signIn('credentials', {
      email: form.email.trim(),
      password: form.password,
      redirect: false,
    })

    const trialStart = new Date()
    saveUser({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      trialStartedAt: trialStart.toISOString(),
    })

    // Trigger welcome email (non-blocking)
    fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'welcome',
        to: form.email.trim(),
        name: form.fullName.trim()
      })
    }).catch(err => console.error('Failed to send welcome email:', err))

    setLoading(false)
    router.push('/onboarding')
  }

  const onChange =
    (name: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((s) => ({ ...s, [name]: e.target.value }))
      if (errors[name]) setErrors((er) => ({ ...er, [name]: '' }))
      if (formError) setFormError(null)
    }

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col justify-center">
        <BackArrow href="/" className="mb-8 self-start" />

        <Card className="rounded-2xl border-border/60 bg-card p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Start your free trial in under a minute.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <GlowInput
              label="Full name"
              name="fullName"
              autoComplete="name"
              value={form.fullName}
              onChange={onChange('fullName')}
              error={errors.fullName}
              placeholder="Alex Rivera"
            />
            <GlowInput
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={onChange('email')}
              error={errors.email}
              placeholder="you@company.com"
            />
            <GlowInput
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={onChange('password')}
              error={errors.password}
              placeholder="••••••••"
            />
            <GlowInput
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={onChange('confirmPassword')}
              error={errors.confirmPassword}
              placeholder="••••••••"
            />

            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}

            <GlowButton
              type="submit"
              size="lg"
              loading={loading}
              className="mt-4 w-full rounded-xl"
            >
              {loading ? 'Creating account...' : 'Start Free Trial'}
            </GlowButton>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            14-day free trial. No credit card required.
          </p>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/signin" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
