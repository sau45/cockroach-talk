import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-brutal-sm border-2 px-2.5 py-0.5 text-xs font-bold font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-border bg-primary text-primary-foreground shadow-brutal-sm',
        secondary:
          'border-border bg-secondary text-secondary-foreground shadow-brutal-dark-sm',
        destructive:
          'border-border bg-destructive text-destructive-foreground shadow-brutal-coral',
        outline: 'border-border text-foreground',
        live: 'border-accent-coral bg-accent-coral/20 text-accent-coral animate-pulse',
        gold: 'border-accent-gold bg-accent-gold/20 text-accent-gold',
        warning: 'border-amber-500 bg-amber-500/20 text-amber-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
