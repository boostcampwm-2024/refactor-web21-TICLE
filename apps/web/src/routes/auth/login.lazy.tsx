import { createLazyFileRoute } from '@tanstack/react-router';

export const Route = createLazyFileRoute('/auth/login')({
  component: RouteComponent,
});

function RouteComponent() {
  return 'local 로그인';
}
