import { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, defaultChecked, onCheckedChange, disabled }, ref) => {
    const isControlled = checked !== undefined;
    const isChecked = isControlled ? checked : defaultChecked;

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange?.(!isChecked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
          isChecked ? 'bg-[#1A1A1A]' : 'bg-[#E5E5E5]',
          disabled && 'opacity-50 cursor-not-allowed',
          'focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:ring-offset-2',
          className
        )}
      >
        <span className="sr-only">Toggle</span>
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm',
            isChecked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
