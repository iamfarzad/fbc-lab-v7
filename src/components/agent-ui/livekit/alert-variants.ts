import { cva } from 'class-variance-authority';

export const alertVariants = cva(
  [
    'relative w-full rounded-lg border px-4 py-3 text-sm grid grid-cols-[0_1fr] gap-y-0.5 items-start',
    'has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  ],
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive: [
          'text-destructive bg-destructive/10 border-destructive/20',
          '[&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);
