import clsx from 'clsx';
import { AudioLines, ListMusic } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { ProfileMenu } from '@/features/auth/ProfileMenu';
import { UploadBadge } from '@/features/upload/UploadBadge';
import { NAV_ITEMS } from './navItems';

/** Desktop (md+) left sidebar. */
export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-2 border-r border-border bg-surface p-3 md:flex">
      <div className="flex items-center gap-2 px-3 py-3 text-lg font-bold">
        <AudioLines className="size-6 text-accent" aria-hidden />
        Strum
      </div>

      <nav aria-label="Main">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg',
                  )
                }
              >
                <Icon className="size-5" aria-hidden />
                {label}
                {to === '/upload' && <UploadBadge className="ml-auto" />}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <section className="mt-4 flex min-h-0 flex-1 flex-col border-t border-border pt-4">
        <h2 className="px-3 pb-2 text-xs font-semibold tracking-wider text-muted uppercase">
          Playlists
        </h2>
        {/* Folder/playlist tree arrives in Phase 4. */}
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted">
          <ListMusic className="size-4" aria-hidden />
          No playlists yet
        </div>
      </section>

      <div className="border-t border-border pt-2">
        <ProfileMenu variant="full" align="start" up />
      </div>
    </aside>
  );
}
