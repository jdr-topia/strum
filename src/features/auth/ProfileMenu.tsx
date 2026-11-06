import clsx from 'clsx';
import { LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Menu } from '@/components/Menu';
import { useAuth } from './useAuth';
import { UserAvatar } from './UserAvatar';

interface ProfileMenuProps {
  /** `full` shows name + email next to the avatar (sidebar); `compact` is just the avatar. */
  variant?: 'full' | 'compact';
  align?: 'start' | 'end';
  /** Open the menu upwards (sidebar footer). */
  up?: boolean;
}

export function ProfileMenu({ variant = 'compact', align = 'end', up = false }: ProfileMenuProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const name = user.displayName ?? user.email ?? 'You';

  return (
    <Menu
      align={align}
      up={up}
      header={
        <div className="min-w-0 px-3 py-2">
          <p className="truncate text-sm font-semibold">{name}</p>
          {user.email && <p className="truncate text-xs text-muted">{user.email}</p>}
        </div>
      }
      items={[
        { label: 'Settings', icon: <Settings />, onSelect: () => navigate('/settings') },
        { label: 'Sign out', icon: <LogOut />, onSelect: () => void signOut() },
      ]}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account"
          className={clsx(
            'flex items-center gap-3 rounded-full text-left transition-colors hover:bg-surface-2',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            variant === 'full' ? 'w-full rounded-lg p-2' : 'p-0.5',
          )}
        >
          <UserAvatar name={name} photoURL={user.photoURL} />
          {variant === 'full' && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{name}</span>
              {user.email && (
                <span className="block truncate text-xs text-muted">{user.email}</span>
              )}
            </span>
          )}
        </button>
      )}
    />
  );
}
