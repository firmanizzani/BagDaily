import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function Modal({
  title,
  description,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className="dialog-content">
          <DialogPrimitive.Title className="text-xl font-bold pr-10">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="muted mt-2 mb-6">
            {description || 'Lengkapi informasi berikut, lalu simpan perubahan.'}
          </DialogPrimitive.Description>
          {children}
          <DialogPrimitive.Close className="dialog-close" aria-label="Tutup dialog">
            <X size={20} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
