import * as React from 'react';
import { cn } from '@/lib/utils';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'destructive'; size?: 'default' | 'sm'; loading?: boolean };
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'default', size = 'default', loading = false, disabled, children, ...props }, ref) => <button ref={ref} className={cn('ui-button', `ui-button-${variant}`, size === 'sm' && 'ui-button-sm', loading && 'ui-button-loading', className)} disabled={disabled || loading} {...props}>{loading ? <span className="ui-button-spinner" aria-hidden="true" /> : children}</button>);
Button.displayName = 'Button';
