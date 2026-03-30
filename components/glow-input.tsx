import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface GlowInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function GlowInput({
  label,
  error,
  icon,
  className,
  ...props
}: GlowInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <Input
          {...props}
          className={cn(
            'rounded-xl bg-input border border-border/60 text-foreground placeholder:text-muted-foreground',
            'focus-visible:border-primary focus-visible:ring-primary/35',
            'transition-colors duration-200',
            icon && 'pl-10',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/50',
            className,
          )}
        />
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
