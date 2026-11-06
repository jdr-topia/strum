import { useState, type FormEvent } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { toast } from './toastStore';
import { friendlyError } from '@/lib/errors';

interface NamePromptModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  initialValue?: string;
  submitLabel: string;
  /** Throws to keep the dialog open. Errors with a friendly message are shown as they are. */
  onSubmit: (name: string) => Promise<void>;
}

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent';

/** Asks for a single name. Parent should remount it (key) for each use so the field resets. */
export function NamePromptModal({
  open,
  onClose,
  title,
  label,
  initialValue = '',
  submitLabel,
  onSubmit,
}: NamePromptModalProps) {
  const [name, setName] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(name);
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Couldn't save. Check your connection and try again."));
      toast.error("Couldn't save that. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={150}
            className={inputClass}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !name.trim()}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
