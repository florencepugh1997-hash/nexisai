'use client'

import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useNexisUser } from '@/contexts/nexis-user-context'

export default function ProgressPage() {
  const { user } = useNexisUser()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Progress
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Snapshot of how you&apos;re executing against your plan.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Phase 1 tasks', value: 42, sub: 'Foundation' },
          { label: 'Weekly actions done', value: 68, sub: 'Last 7 days' },
          { label: 'KPI on track', value: 55, sub: 'Demo metric' },
        ].map((m) => (
          <Card key={m.label} className="rounded-2xl border-border/60 bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {m.sub}
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">{m.value}%</p>
            <p className="mt-1 text-sm text-muted-foreground">{m.label}</p>
            <Progress value={m.value} className="mt-4 h-2" />
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-border/60 bg-card p-6">
        <h2 className="font-display text-lg font-bold text-foreground">Focus this week</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {user?.businessName
            ? `Based on ${user.businessName}, prioritize one acquisition experiment and one conversion fix.`
            : 'Complete your profile and plan to unlock personalized progress insights.'}
        </p>
      </Card>
    </div>
  )
}
