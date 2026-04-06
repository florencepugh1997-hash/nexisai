'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GlowButton } from '@/components/glow-button'
import { GlowInput } from '@/components/glow-input'
import { BackArrow } from '@/components/app/back-arrow'
import { useNexisUser } from '@/contexts/nexis-user-context'
import { Card } from '@/components/ui/card'
import { signIn } from 'next-auth/react'
import { getUserProfileData } from '@/app/actions/user'

export default function SignInPage() {
  const router = useRouter()
  const { saveUser } = useNexisUser()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.email.trim()) e.email = 'Email is required'
    if (!form.password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setFormError(null)
    if (!validate()) return
    setLoading(true)

    const response = await signIn('credentials', {
      email: form.email.trim(),
      password: form.password,
      redirect: false,
    })

    if (response?.error) {
      setFormError('Invalid email or password')
      setLoading(false)
      return
    }

    const email = form.email.trim()
    const profile = await getUserProfileData()

    const metaName = profile?.full_name

    saveUser({
      fullName: metaName ?? email.split('@')[0] ?? 'User',
      email,
      trialStartedAt:
        profile?.trial_start_date?.toISOString?.() ??
        (profile?.trial_start_date as unknown as string) ??
        new Date().toISOString(),
    })

    setLoading(false)
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col justify-center">
        <BackArrow href="/" className="mb-8 self-start" />

        <Card className="rounded-2xl border-border/60 bg-card p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue to your growth workspace.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <GlowInput
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => {
                setForm((s) => ({ ...s, email: e.target.value }))
                if (errors.email) setErrors((er) => ({ ...er, email: '' }))
                if (formError) setFormError(null)
              }}
              error={errors.email}
              placeholder="you@company.com"
            />
            <div>
              <GlowInput
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => {
                  setForm((s) => ({ ...s, password: e.target.value }))
                  if (errors.password) setErrors((er) => ({ ...er, password: '' }))
                  if (formError) setFormError(null)
                }}
                error={errors.password}
                placeholder="••••••••"
              />
              <div className="mt-2 text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
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
              {loading ? 'Signing in...' : 'Sign In'}
            </GlowButton>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Get Started
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
