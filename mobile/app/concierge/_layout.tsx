import { RoleShell, RoleStack } from '@/components/navigation/RoleTabs';
import { RouteError } from '@/components/navigation/RouteError';

export { RouteError as ErrorBoundary };

/** Portería: guardia + servicios en tiempo real + Stack (pestañas y pantallas secundarias). */
export default function ConciergeLayout() {
  return (
    <RoleShell role="CONCIERGE">
      <RoleStack screens={['emergencies']} />
    </RoleShell>
  );
}
