import * as React from 'react';
import { cn } from '@/lib/utils';
export const Badge = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span className={cn('ui-badge', className)} {...props} />;
