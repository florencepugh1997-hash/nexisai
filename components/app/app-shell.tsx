'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ClipboardList,
  Home,
  Settings,
  TrendingUp,
  UserRound,
} from 'lucide-react'
import { NexisWordmark } from '@/components/app/nexis-wordmark'
import { cn } from '@/lib/utils'
import { useNexisUser } from '@/contexts/nexis-user-context'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const nav = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/plan', label: 'My Plan', icon: ClipboardList },
  { href: '/journey', label: 'My Journey', icon: TrendingUp },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useNexisUser()

  const NavItems = () => (
    <>
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-5 w-5 shrink-0 opacity-90" />
            {label}
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* ── Fixed sidebar (desktop) ── */}
      <aside className="hidden h-full w-56 shrink-0 flex-col border-r border-border/60 bg-sidebar md:flex">
        <div className="h-14 shrink-0 border-b border-border/60 px-3 pt-4">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Menu
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 pt-2" aria-label="Main">
          <NavItems />
        </nav>
      </aside>

      {/* ── Right column: fixed topbar + scrollable content ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-sidebar/95 px-4 backdrop-blur-md">
          <NexisWordmark href="/dashboard" />
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Link
              href="/settings/profile"
              className="group relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 transition-all hover:border-primary/50 hover:ring-2 hover:ring-primary/20"
              aria-label="Profile"
            >
              <Avatar className="h-full w-full">
                {user?.avatar_url ? (
                  <AvatarImage src={user.avatar_url} alt={user.fullName} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                  {user?.fullName?.charAt(0).toUpperCase() || 'F'}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        {/* Only this area scrolls */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
            {children}
          </div>
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-border/60 bg-sidebar/98 px-2 py-2 backdrop-blur-md md:hidden"
        aria-label="Mobile"
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
