import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-[#6E7E8D]/30 bg-white px-3 py-2 text-sm text-[#001524] placeholder:text-[#6E7E8D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15616D] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            error && 'border-rose-500 focus-visible:ring-rose-500',
            className,
          )}
          ref={ref}
          {...props}
        />
        {error ? <p className="text-xs text-rose-600 mt-1">{error}</p> : null}
      </div>
    );
  },
);
Input.displayName = 'Input';
