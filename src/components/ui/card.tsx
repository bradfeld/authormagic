import * as React from 'react';

import { cn } from '@/lib/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground rounded-lg border border-border shadow-sm transition-colors',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col space-y-2 p-6 pb-4', className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      className={cn(
        'text-lg font-semibold leading-none tracking-tight',
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn('text-sm text-muted-foreground leading-relaxed', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
