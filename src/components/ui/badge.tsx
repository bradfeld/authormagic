import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
        secondary:
          'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300',
        success:
          'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-300',
        warning:
          'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-300',
        destructive:
          'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-300',
        outline: 'text-foreground border border-border bg-background',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
