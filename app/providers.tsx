'use client'

import * as React from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import { NexisUserProvider } from '@/contexts/nexis-user-context'
import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <NexisUserProvider>{children}</NexisUserProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
