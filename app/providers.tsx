'use client'

import * as React from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import { NexisUserProvider } from '@/contexts/nexis-user-context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <NexisUserProvider>{children}</NexisUserProvider>
    </ThemeProvider>
  )
}
