import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15616D] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[#001524] text-white hover:bg-[#0B2E35] shadow-xs active:scale-[0.99]',
        teal: 'bg-[#15616D] text-white hover:bg-[#0B2E35] active:scale-[0.99]',
        cream:
          'bg-[#FFECD1] text-[#001524] hover:bg-[#F3E4CF] font-bold border border-[#F3E4CF]',
        outline:
          'border border-[#6E7E8D]/30 bg-transparent text-[#001524] hover:bg-[#E6EEF0]/50 hover:border-[#15616D]',
        secondary: 'bg-[#E6EEF0] text-[#001524] hover:bg-[#6E7E8D]/20',
        ghost: 'hover:bg-[#E6EEF0]/60 text-[#001524]',
        destructive: 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs',
        link: 'text-[#15616D] underline-offset-4 hover:underline p-0 h-auto font-medium',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
