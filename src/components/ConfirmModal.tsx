import { useState } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { toast } from './toastStore';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

/** Yes/no confirmation for destructive actions. */
export function ConfirmModal({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmModalProps) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      toast.error("Couldn't complete that. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">{description}</p>
    </Modal>
  );
}
