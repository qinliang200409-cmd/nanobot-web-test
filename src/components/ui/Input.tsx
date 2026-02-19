import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full h-10 px-3 text-sm bg-white border rounded-lg transition-all duration-200',
          'placeholder:text-[#999999]',
          'focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent',
          'disabled:bg-[#F5F5F5] disabled:cursor-not-allowed',
          error ? 'border-[#DC2626] focus:ring-[#DC2626]' : 'border-[#E5E5E5] hover:border-[#CCCCCC]',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
