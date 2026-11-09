import { RoleTabBar } from '@/components/navigation/RoleTabs';

export default function ConciergeTabsLayout() {
  return (
    <RoleTabBar
      tabs={[
        { name: 'dashboard', title: 'Inicio', icon: 'grid-outline', activeIcon: 'grid' },
        { name: 'visits', title: 'Visitas', icon: 'people-outline', activeIcon: 'people' },
        { name: 'correspondence', title: 'Entregas', icon: 'cube-outline', activeIcon: 'cube' },
        { name: 'residents', title: 'Llamar', icon: 'call-outline', activeIcon: 'call' },
        { name: 'mailbox', title: 'Buzón', icon: 'mail-outline', activeIcon: 'mail', mailBadge: true },
      ]}
    />
  );
}
