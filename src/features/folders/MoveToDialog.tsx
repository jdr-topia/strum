import { Folder as FolderIcon, Library } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/toastStore';
import { friendlyError } from '@/lib/errors';
import type { Folder } from '@/types/folder';
import { flattenFolders } from './folderTree';

interface MoveToDialogProps {
  title: string;
  folders: Folder[];
  currentFolderId: string | null;
  /** Why an item can't go to a target (null = allowed). Defaults to allowing everything. */
  targetError?: (targetId: string | null) => string | null;
  onMove: (targetId: string | null) => Promise<void>;
  onClose: () => void;
}

/** Picks a destination folder (or the library root). Impossible targets are shown but disabled. */
export function MoveToDialog({
  title,
  folders,
  currentFolderId,
  targetError,
  onMove,
  onClose,
}: MoveToDialogProps) {
  const [busy, setBusy] = useState(false);
  const options = useMemo(() => flattenFolders(folders), [folders]);

  const move = async (targetId: string | null) => {
    setBusy(true);
    try {
      await onMove(targetId);
      onClose();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't move it. Check your connection and try again."));
    } finally {
      setBusy(false);
    }
  };

  const rows: { id: string | null; label: string; icon: 'root' | 'folder' }[] = [
    { id: null, label: 'Library (no folder)', icon: 'root' },
    ...options.map((o) => ({ id: o.folder.id, label: o.label, icon: 'folder' as const })),
  ];

  return (
    <Modal open onClose={onClose} title={title}>
      <ul className="max-h-[50dvh] space-y-0.5 overflow-y-auto">
        {rows.map((row) => {
          const isCurrent = row.id === currentFolderId;
          const reason = isCurrent ? 'Already here' : (targetError?.(row.id) ?? null);
          const Icon = row.icon === 'root' ? Library : FolderIcon;
          return (
            <li key={row.id ?? 'root'}>
              <button
                type="button"
                disabled={busy || reason !== null}
                onClick={() => move(row.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2 disabled:opacity-50"
              >
                <Icon className="size-4 shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{row.label}</span>
                  {reason && <span className="block truncate text-xs text-muted">{reason}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
