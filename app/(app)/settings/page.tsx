'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, Trash2, Sun, Moon } from 'lucide-react'
import { useNexisUser } from '@/contexts/nexis-user-context'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { GlowButton } from '@/components/glow-button'
import { useState, type ReactNode, useEffect } from 'react'
import { cn } from '@/lib/utils'

import { useTheme } from 'next-themes'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function Row({
  title,
  subtitle,
  onClick,
  right,
}: {
  title: string
  subtitle?: string
  onClick?: () => void
  right?: ReactNode
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 text-left transition-colors',
        onClick && 'hover:border-primary/35',
      )}
    >
      <div className="min-w-0">
        <p className="font-medium text-foreground">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {right}
        {onClick ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : null}
      </div>
    </Comp>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, signOut } = useNexisUser()
  const [notifications, setNotifications] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  const [isDeleting, setIsDeleting] = useState(false)
  const [authUserId, setAuthUserId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    let cancelled = false
    ;(async () => {
      const session = await import('next-auth/react').then(m => m.getSession())
      if (cancelled) return
      if (!session?.user?.id) return router.push('/signin')

      setAuthUserId(session.user.id)

      const profile = await import('@/app/actions/user').then(m => m.getUserProfileData())

      if (!cancelled && profile) {
        setIsSubscribed(!!profile.is_subscribed)
      }
    })()
    return () => { cancelled = true }
  }, [router])

  const handleDeleteAccount = async () => {
    if (!authUserId) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: authUserId })
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to delete account')
      }
      await signOut()
      router.push('/signup?message=Your account has been deleted')
    } catch (err: any) {
      alert(err.message)
      setIsDeleting(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <div>
         <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Settings</h1>
         <p className="mt-1 text-sm text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <section className="space-y-2">
         <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</h2>
         <div 
           onClick={() => router.push('/settings/profile')}
           className="flex w-full items-center justify-between gap-4 rounded-xl border border-border/60 bg-card p-4 text-left transition-colors hover:border-primary/35 cursor-pointer shadow-sm group"
         >
           <div className="flex items-center gap-4">
             <Avatar className="h-12 w-12 bg-primary/10 text-primary border border-primary/20">
               {user?.avatar_url ? <AvatarImage src={user.avatar_url} alt="Avatar" /> : null}
               <AvatarFallback className="text-lg font-bold bg-transparent">
                 {user?.fullName?.charAt(0).toUpperCase()}
               </AvatarFallback>
             </Avatar>
             <div className="flex flex-col min-w-0">
               <p className="font-semibold text-foreground truncate">{user?.fullName || 'Your Name'}</p>
               <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
             </div>
           </div>
           <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
         </div>
      </section>

      <section className="space-y-2">
         <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subscription</h2>
         {isSubscribed ? (
           <Row
             title="Nexis Pro"
             subtitle="Active Subscription"
             right={<span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">Active</span>}
           />
         ) : (
           <Row
             title="Free trial"
             subtitle="Upgrade for full plan access"
             onClick={() => router.push('/upgrade')}
           />
         )}
      </section>

      <section className="space-y-2">
         <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Appearance</h2>
         <Card className="rounded-xl border-border/60 bg-card p-3">
           <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
             {mounted && (
               <>
                 <button
                   onClick={() => setTheme('light')}
                   className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-sm font-medium", theme === 'light' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-background/50')}
                 >
                   <Sun className="w-4 h-4" /> Light
                 </button>
                 <button
                   onClick={() => setTheme('dark')}
                   className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-sm font-medium", theme === 'dark' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-background/50')}
                 >
                   <Moon className="w-4 h-4" /> Dark
                 </button>
               </>
             )}
           </div>
         </Card>
      </section>

      <section className="space-y-2">
         <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notifications</h2>
         <Card className="rounded-xl border-border/60 bg-card px-4 py-3">
           <div className="flex items-center justify-between gap-3">
             <div>
               <p className="font-medium text-foreground">Product updates</p>
               <p className="text-xs text-muted-foreground">Email & in-app</p>
             </div>
             <Switch checked={notifications} onCheckedChange={setNotifications} />
           </div>
         </Card>
      </section>

      <section className="space-y-2">
         <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Support</h2>
         <Row title="Help center" onClick={() => router.push('/help')} />
      </section>

      <section className="space-y-2 pt-6">
         <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-destructive">Danger Zone</h2>
         <Card className="rounded-xl border-destructive/30 bg-card p-4">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div>
               <p className="font-medium text-foreground">Delete Account</p>
               <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                 Permanently delete your account, business profile, growth plan and all daily plans. This cannot be undone.
               </p>
             </div>
             
             <AlertDialog>
               <AlertDialogTrigger asChild>
                 <GlowButton variant="secondary" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                   Delete Account
                 </GlowButton>
               </AlertDialogTrigger>
               <AlertDialogContent className="rounded-2xl max-w-md">
                 <AlertDialogHeader>
                   <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                     <Trash2 className="w-5 h-5" /> Delete Account
                   </AlertDialogTitle>
                   <AlertDialogDescription>
                     Are you sure? This will permanently delete your account, business profile, growth plan and all daily plans. This action cannot be undone.
                   </AlertDialogDescription>
                 </AlertDialogHeader>
                 <AlertDialogFooter className="mt-6">
                   <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                   <AlertDialogAction asChild className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                     <button onClick={handleDeleteAccount} disabled={isDeleting}>
                       {isDeleting ? 'Deleting...' : 'Delete My Account'}
                     </button>
                   </AlertDialogAction>
                 </AlertDialogFooter>
               </AlertDialogContent>
             </AlertDialog>
           </div>
         </Card>
      </section>

      <GlowButton
        type="button"
        variant="secondary"
        className="w-full rounded-xl mt-6 opacity-80"
        onClick={handleSignOut}
      >
        Sign Out
      </GlowButton>
    </div>
  )
}
