import Link from 'next/link'
import { cn } from '@/lib/utils'

export function NexisWordmark({
  className,
  href = '/dashboard',
}: {
  className?: string
  href?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'font-display text-xl font-bold tracking-tight text-foreground',
        'drop-shadow-[0_0_12px_rgba(0,232,135,0.35)]',
        className,
      )}
    >
      Nexis
    </Link>
  )
}
