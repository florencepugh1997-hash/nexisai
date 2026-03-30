import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children?: React.ReactNode;
}

export function GlowButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  children,
  ...props
}: GlowButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'relative overflow-hidden font-semibold transition-colors duration-200',
        variant === 'primary' && [
          'bg-primary text-primary-foreground hover:bg-primary/92',
          'shadow-none border-0',
        ],
        variant === 'secondary' && [
          'bg-accent text-accent-foreground hover:bg-accent/90',
          'shadow-none border-0',
        ],
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-6 py-2.5 text-base',
        size === 'lg' && 'px-8 py-3 text-lg',
        'rounded-xl',
        className,
      )}
    >
      {loading && (
        <span className="absolute inset-0 animate-pulse bg-white/10" />
      )}
      <span className="relative flex items-center justify-center gap-2">
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </span>
    </Button>
  );
}
