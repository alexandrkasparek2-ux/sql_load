export type AppNavId = 'overview' | 'meals' | 'coach' | 'lab' | 'stack' | 'profile';

export interface AppNavItem {
  id: AppNavId;
  to: string;
  label: string;
  shortLabel: string;
  title: string;
  subtitle: string;
}

export const APP_NAV_ITEMS = [
  {
    id: 'overview',
    to: '/',
    label: 'Přehled',
    shortLabel: 'Přehled',
    title: 'Today',
    subtitle: 'CycloFuel',
  },
  {
    id: 'meals',
    to: '/foods',
    label: 'Jídla',
    shortLabel: 'Jídla',
    title: 'Meals',
    subtitle: 'Deník',
  },
  {
    id: 'coach',
    to: '/chat',
    label: 'AI',
    shortLabel: 'AI',
    title: 'Coach',
    subtitle: 'AI',
  },
  {
    id: 'lab',
    to: '/plan',
    label: 'Plán',
    shortLabel: 'Plán',
    title: 'Lab',
    subtitle: 'Performance',
  },
  {
    id: 'stack',
    to: '/supplements',
    label: 'Supl.',
    shortLabel: 'Supl.',
    title: 'Stack',
    subtitle: 'Doplňky',
  },
  {
    id: 'profile',
    to: '/profile',
    label: 'Profil',
    shortLabel: 'Profil',
    title: 'Profil',
    subtitle: 'Nastavení',
  },
] as const satisfies readonly AppNavItem[];

export function getActiveNavItem(pathname: string): AppNavItem {
  return APP_NAV_ITEMS.find(item =>
    item.to === '/'
      ? pathname === '/'
      : pathname.startsWith(item.to)
  ) ?? APP_NAV_ITEMS[0];
}
