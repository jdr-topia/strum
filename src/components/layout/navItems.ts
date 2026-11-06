import { House, Library, Search, Upload, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Main destinations, shared by the desktop sidebar and mobile tab bar. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/upload', label: 'Upload', icon: Upload },
];
