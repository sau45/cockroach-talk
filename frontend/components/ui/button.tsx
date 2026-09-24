import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-brutal-sm text-sm font-bold uppercase transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none active:translate-x-0.5 active:translate-y-0.5',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground border-2 border-border shadow-brutal hover:shadow-brutal-lg hover:bg-opacity-95',
        destructive:
          'bg-destructive text-destructive-foreground border-2 border-border shadow-brutal-coral hover:bg-opacity-95',
        outline:
          'border-2 border-border bg-card text-foreground shadow-brutal-dark hover:bg-muted',
        secondary:
          'bg-secondary text-secondary-foreground border-2 border-border shadow-brutal-dark hover:bg-opacity-90',
        ghost: 'hover:bg-muted text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
