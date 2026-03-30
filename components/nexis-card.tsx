import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NexisCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glow' | 'gradient';
  children?: React.ReactNode;
}

export function NexisCard({
  variant = 'default',
  className,
  children,
  ...props
}: NexisCardProps) {
  return (
    <Card
      {...props}
      className={cn(
        'bg-card border border-border/50 rounded-xl transition-all duration-300',
        variant === 'glow' && 'border-primary/25 glow-sm hover:border-primary/40',
        variant === 'gradient' && [
          'bg-card border-primary/20',
        ],
        'hover:shadow-lg hover:border-border',
        className,
      )}
    >
      {children}
    </Card>
  );
}

export function NexisCardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn('p-4 sm:p-6', className)}>
      {children}
    </div>
  );
}

export function NexisCardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('px-4 py-3 border-b border-border/50 sm:px-6 sm:py-4', className)}
    >
      {children}
    </div>
  );
}

export function NexisCardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      {...props}
      className={cn('text-lg font-semibold text-foreground', className)}
    >
      {children}
    </h3>
  );
}
