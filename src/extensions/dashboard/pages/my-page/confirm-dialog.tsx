import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
};

export const ConfirmDialog = ({ open, title, description, confirmLabel, onConfirm, onOpenChange }: ConfirmDialogProps) => {
  const [busy, setBusy] = useState(false);
  const confirm = async () => { setBusy(true); try { await onConfirm(); onOpenChange(false); } finally { setBusy(false); } };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="dialog-small">
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button variant="destructive" loading={busy} onClick={() => void confirm()}>{confirmLabel}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
};
