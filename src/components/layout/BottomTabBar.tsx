import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import { UploadBadge } from '@/features/upload/UploadBadge';
import { NAV_ITEMS } from './navItems';

/** Mobile (<md) bottom tab bar. */
export function BottomTabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid h-tabbar grid-cols-5">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex h-full min-w-0 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                  isActive ? 'text-fg' : 'text-muted',
                )
              }
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden />
                {to === '/upload' && (
                  <UploadBadge className="absolute -top-1.5 -right-3 size-5 min-w-0 px-0 text-[10px]" />
                )}
              </span>
              <span className="max-w-full truncate px-0.5">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
