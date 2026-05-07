export type AppNavId = 'dnes' | 'plan' | 'jidlo' | 'suplem' | 'coach';

export interface AppNavItem {
  id: AppNavId;
  to: string;
  label: string;
  shortLabel: string;
  title: string;
  subtitle: string;
}

export const APP_NAV_ITEMS = [
  { id: 'dnes',   to: '/',            label: 'Dnes',    shortLabel: 'DNES',    title: 'Dnes',   subtitle: 'CycloFuel' },
  { id: 'plan',   to: '/plan',        label: 'Plán',    shortLabel: 'PLÁN',    title: 'Plán',   subtitle: 'Trénink'   },
  { id: 'jidlo',  to: '/foods',       label: 'Jídlo',   shortLabel: 'JÍDLO',   title: 'Jídla',  subtitle: 'Deník'     },
  { id: 'suplem', to: '/supplements', label: 'Suplem.', shortLabel: 'SUPLEM.', title: 'Stack',  subtitle: 'Doplňky'   },
  { id: 'coach',  to: '/chat',        label: 'Coach',   shortLabel: 'COACH',   title: 'Coach',  subtitle: 'AI Coach'  },
] as const satisfies readonly AppNavItem[];

export function getActiveNavItem(pathname: string): AppNavItem {
  return APP_NAV_ITEMS.find(item =>
    item.to === '/'
      ? pathname === '/'
      : pathname.startsWith(item.to)
  ) ?? APP_NAV_ITEMS[0];
}
