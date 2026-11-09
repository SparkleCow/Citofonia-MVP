import { RoleTabs } from '@/components/navigation/RoleTabs';
import { RouteError } from '@/components/navigation/RouteError';

export { RouteError as ErrorBoundary };

export default function ResidentLayout() {
  return (
    <RoleTabs
      role="USER"
      tabs={[
        { name: 'dashboard', title: 'Inicio', icon: 'home-outline', activeIcon: 'home' },
        { name: 'visits', title: 'Visitas', icon: 'people-outline', activeIcon: 'people' },
        { name: 'correspondence', title: 'Paquetes', icon: 'cube-outline', activeIcon: 'cube' },
        { name: 'mailbox', title: 'Buzón', icon: 'mail-outline', activeIcon: 'mail', mailBadge: true },
      ]}
    />
  );
}
