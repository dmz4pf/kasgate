import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zn-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full h-10 rounded-md px-3 text-sm',
              'bg-zn-alt border border-zn-border text-zn-text placeholder:text-zn-muted',
              'focus:outline-none focus:ring-2 focus:ring-zn-accent focus:border-transparent',
              icon && 'pl-10',
              error && 'border-zn-error focus:ring-zn-error',
              'disabled:bg-zn-surface disabled:text-zn-muted disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-zn-error">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
