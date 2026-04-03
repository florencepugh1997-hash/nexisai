'use client'

import { useState, useEffect } from 'react'


export default function TestUnlockPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)

  useEffect(() => {
    import('next-auth/react').then(m => {
      m.getSession().then(session => {
        setUser(session?.user || null)
      })
    })
  }, [])

  const handleForceUnlock = async () => {
    if (!user) return
    setLoading(true)
    setResponse(null)
    try {
      const res = await fetch('/api/force-unlock-next-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          current_day_number: 1
        })
      })
      const data = await res.json()
      setResponse(data)
    } catch (err: any) {
      setResponse({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg p-10 space-y-6 bg-card text-foreground">
      <div className="rounded border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        <h2 className="font-bold">⚠️ Test page - Remove before launch</h2>
        <p className="text-sm">This page forcefully triggers the DAY 2 unlock procedure.</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold">User Status</h3>
        <p className="text-sm text-muted-foreground">
          {user ? `Logged in as: ${user.email} (${user.id})` : 'Not logged in'}
        </p>
      </div>

      <button
        onClick={handleForceUnlock}
        disabled={!user || loading}
        className="w-full rounded bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Force Unlock Next Day (Test Only)'}
      </button>

      {response && (
        <div className="rounded border p-4 bg-muted/50 overflow-auto">
          <h4 className="font-semibold mb-2">Response:</h4>
          <pre className="text-xs">{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
