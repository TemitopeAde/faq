import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';

export const TooltipProvider = TooltipPrimitive.Provider;

// Wraps a single focusable child (button, link) and shows `content` on hover and keyboard focus.
export const Tooltip = ({ content, children, side = 'top' }: { content: React.ReactNode; children: React.ReactElement; side?: 'top' | 'bottom' | 'left' | 'right' }) => (
  <TooltipPrimitive.Root>
    <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content className="tooltip-content" side={side} sideOffset={6} collisionPadding={12}>
        {content}
        <TooltipPrimitive.Arrow className="tooltip-arrow" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  </TooltipPrimitive.Root>
);

// A small ⓘ icon that explains the label next to it.
export const InfoTip = ({ content, label = 'More information' }: { content: React.ReactNode; label?: string }) => (
  <Tooltip content={content}>
    <button type="button" className="info-tip" aria-label={label}><Info size={14} /></button>
  </Tooltip>
);
