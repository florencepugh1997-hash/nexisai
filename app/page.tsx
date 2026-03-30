'use client'

import { useRouter } from 'next/navigation'
import { GlowButton } from '@/components/glow-button'
import { cn } from '@/lib/utils'

export default function SplashPage() {
  const router = useRouter()

  const features = [
    'Personalized 90-day growth roadmap',
    'AI insights tailored to your business',
    'Clear weekly actions you can execute',
  ]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <h1
          className={cn(
            'font-display text-5xl font-bold tracking-tight text-foreground',
            'drop-shadow-[0_0_20px_rgba(0,232,135,0.45)]',
          )}
        >
          Nexis
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Your AI Growth Strategist
        </p>

        <ul className="mt-10 w-full space-y-4 text-left">
          {features.map((text) => (
            <li key={text} className="flex gap-3 text-sm text-foreground/90">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary"
                aria-hidden
              >
                ✓
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <GlowButton
          type="button"
          size="lg"
          className="mt-10 w-full max-w-[400px] rounded-xl"
          onClick={() => router.push('/signup')}
        >
          Get Started
        </GlowButton>

        <p className="mt-6 text-sm text-muted-foreground">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => router.push('/signin')}
            className="font-semibold text-primary hover:underline"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  )
}
