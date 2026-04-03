'use client'

// IMPORTANT: Create a public storage bucket called "avatars" in Supabase Dashboard → Storage

import { useRouter } from 'next/navigation'
import { Camera, Lock, Info } from 'lucide-react'
import { useNexisUser } from '@/contexts/nexis-user-context'
import { Card } from '@/components/ui/card'
import { GlowButton } from '@/components/glow-button'
import { GlowInput } from '@/components/glow-input'
import { useState, useEffect, useRef } from 'react'
import { BackArrow } from '@/components/app/back-arrow'
import { useSession } from 'next-auth/react'
import { getUserProfileData, getBusinessProfileData, updateProfileData } from '@/app/actions/user'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function ProfilePage() {
  const router = useRouter()
  const { user, saveUser, refreshUser } = useNexisUser()
  
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  
  const [uploading, setUploading] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [authUserId, setAuthUserId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const session = await import('next-auth/react').then(m => m.getSession())
      if (cancelled) return
      if (!session?.user?.id) return router.push('/signin')
      setAuthUserId(session.user.id)
      setFullName(user?.fullName || '')

      const [profileRes, bizRes] = await Promise.all([
        getUserProfileData(),
        getBusinessProfileData()
      ])

      if (!cancelled) {
        if (profileRes) {
          if (profileRes.avatar_url) setAvatarUrl(profileRes.avatar_url)
          if (profileRes.full_name) setFullName(profileRes.full_name)
        }
        if (bizRes) {
          setBusinessName(bizRes.business_name || '')
        }
      }
    })()
    return () => { cancelled = true }
  }, [user, router])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!authUserId) return
      if (!e.target.files || e.target.files.length === 0) return
      
      const file = e.target.files[0]
      const formData = new FormData()
      formData.append('file', file)
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      await updateProfileData({ avatar_url: data.url })
      setAvatarUrl(data.url)
      await refreshUser()
    } catch (err: any) {
      alert('Error uploading avatar: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authUserId || fullName === user?.fullName) return
    setSavingProfile(true)
    try {
      const { error } = await updateProfileData({ full_name: fullName })
      if (error) throw new Error(error)
      saveUser({ ...user!, fullName, email: user?.email || '' })
      await refreshUser()
      setProfileMessage('Changes saved successfully')
      setTimeout(() => router.push('/settings'), 2000)
    } catch (err: any) {
      alert('Failed to update profile: ' + err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const isChanged = fullName !== user?.fullName

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <div className="flex flex-col gap-1 relative">
        <BackArrow href="/settings" className="mb-4 self-start" />
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          My Profile
        </h1>
      </div>

      <Card className="rounded-2xl border-border/60 bg-card p-6 md:p-8 flex flex-col items-center">
        <Avatar className="h-24 w-24 bg-primary/10 text-primary border-2 border-primary/20 shadow-md mb-6">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="Avatar" /> : null}
          <AvatarFallback className="text-3xl font-bold bg-transparent">
            {fullName ? fullName.charAt(0).toUpperCase() : user?.fullName?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <input 
          type="file" 
          accept="image/jpeg, image/png" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleAvatarUpload}
        />
        <GlowButton 
          variant="secondary" 
          size="sm" 
          onClick={() => fileInputRef.current?.click()} 
          disabled={uploading}
          className="flex items-center gap-2 rounded-xl mb-8"
        >
          <Camera className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Change Photo'}
        </GlowButton>

        <form onSubmit={handleSaveProfile} className="w-full max-w-md space-y-6">
          <GlowInput
            label="Full Name"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <div className="space-y-1 relative">
             <GlowInput
               label="Email Address"
               name="email"
               value={user?.email || ''}
               readOnly
               className="opacity-70 pr-10 bg-muted/20"
             />
             <Lock className="w-4 h-4 text-muted-foreground absolute right-4 top-[38px]" />
          </div>

          <div className="space-y-1 relative">
             <GlowInput
               label="Business Name"
               name="businessName"
               value={businessName}
               readOnly
               className="opacity-70 pr-10 bg-muted/20"
             />
             <Info className="w-4 h-4 text-muted-foreground absolute right-4 top-[38px]" />
          </div>

          <div className="flex flex-col items-center gap-3 pt-4">
            <GlowButton 
              type="submit" 
              className="w-full rounded-xl" 
              disabled={!isChanged || savingProfile}
              loading={savingProfile}
            >
              Save Changes
            </GlowButton>
            {profileMessage && <span className="text-sm font-medium text-primary animate-in fade-in">{profileMessage}</span>}
          </div>
        </form>
      </Card>
    </div>
  )
}
