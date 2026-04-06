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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
            <div className="relative">
              <GlowInput
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={onChange('password')}
                error={errors.password}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="relative">
              <GlowInput
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={onChange('confirmPassword')}
                error={errors.confirmPassword}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

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
