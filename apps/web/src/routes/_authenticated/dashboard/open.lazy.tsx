import { createLazyFileRoute } from '@tanstack/react-router';

import Open from '@/components/dashboard/open';

export const Route = createLazyFileRoute('/_authenticated/dashboard/open')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Open />;
}
