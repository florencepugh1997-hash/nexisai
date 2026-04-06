'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { GlowButton } from '@/components/glow-button'
import { GlowInput } from '@/components/glow-input'
import { BackArrow } from '@/components/app/back-arrow'
import { Card } from '@/components/ui/card'
import { Suspense } from 'react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromQuery = searchParams.get('email') ?? ''

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    setErrors((e) => ({ ...e, otp: '' }))
    setFormError(null)

    // Auto-advance
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const newOtp = [...otp]
        newOtp[index] = ''
        setOtp(newOtp)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length > 0) {
      const newOtp = [...otp]
      pasted.split('').forEach((char, i) => { newOtp[i] = char })
      setOtp(newOtp)
      const nextIndex = Math.min(pasted.length, 5)
      inputRefs.current[nextIndex]?.focus()
    }
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (otp.some((d) => d === '')) e.otp = 'Please enter all 6 digits'
    if (!newPassword) e.newPassword = 'Password is required'
    else if (newPassword.length < 8) e.newPassword = 'At least 8 characters'
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password'
    else if (confirmPassword !== newPassword) e.confirmPassword = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setFormError(null)
    if (!validate()) return
    setLoading(true)

    const res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailFromQuery,
        otp: otp.join(''),
        newPassword,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setFormError(data.error || 'Something went wrong.')
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/signin'), 2500)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col justify-center">
        <BackArrow href="/forgot-password" className="mb-8 self-start" />

        <Card className="rounded-2xl border-border/60 bg-card p-6 sm:p-8">
          {/* Icon */}
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Enter your code
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-foreground">{emailFromQuery || 'your email'}</span>.
            Enter it below along with your new password.
          </p>

          {success ? (
            <div className="mt-8 rounded-xl border border-primary/30 bg-primary/10 p-5 text-center">
              <p className="text-base font-semibold text-primary">✓ Password reset!</p>
              <p className="mt-1 text-sm text-muted-foreground">Redirecting you to sign in…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">

              {/* OTP boxes */}
              <div>
                <label className="mb-3 block text-sm font-medium text-foreground">
                  Verification code
                </label>
                <div className="flex gap-2 sm:gap-3">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className="h-14 w-full rounded-xl border border-border/60 bg-background/60 text-center text-xl font-bold text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      style={{ caretColor: 'transparent' }}
                    />
                  ))}
                </div>
                {errors.otp && (
                  <p className="mt-2 text-sm text-destructive">{errors.otp}</p>
                )}
              </div>

              {/* New password */}
              <GlowInput
                label="New password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  if (errors.newPassword) setErrors((er) => ({ ...er, newPassword: '' }))
                  setFormError(null)
                }}
                error={errors.newPassword}
                placeholder="••••••••"
              />

              {/* Confirm new password */}
              <GlowInput
                label="Confirm new password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (errors.confirmPassword) setErrors((er) => ({ ...er, confirmPassword: '' }))
                  setFormError(null)
                }}
                error={errors.confirmPassword}
                placeholder="••••••••"
              />

              {formError && (
                <p className="text-sm text-destructive" role="alert">{formError}</p>
              )}

              <GlowButton
                type="submit"
                size="lg"
                loading={loading}
                className="w-full rounded-xl"
              >
                {loading ? 'Resetting password...' : 'Reset Password'}
              </GlowButton>

              <p className="text-center text-sm text-muted-foreground">
                Didn&apos;t receive the code?{' '}
                <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
                  Resend
                </Link>
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
