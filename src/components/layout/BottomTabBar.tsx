import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';

/** Mobile (<md) bottom tab bar. */
export function BottomTabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid h-tabbar grid-cols-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                  isActive ? 'text-fg' : 'text-muted',
                )
              }
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
