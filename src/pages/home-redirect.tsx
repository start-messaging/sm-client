import { Navigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { useMyWorkspaces } from '@/api/hooks/use-workspaces';
import { useAuthStore } from '@/stores/auth.store';

/**
 * `/` renders nothing — it only decides where home IS: the last workspace the
 * user worked in (if they still belong to it), else their first workspace,
 * else the services gallery. Keeps returning users one reload away from work
 * without trapping new users anywhere.
 */
export function HomeRedirect() {
  const lastSlug = useAuthStore((s) => s.activeWorkspaceSlug);
  const { data: workspaces, isError } = useMyWorkspaces();

  if (isError) return <Navigate to="/services" replace />;
  if (!workspaces) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  const last = lastSlug && workspaces.find((w) => w.slug === lastSlug);
  const target = last ?? workspaces[0];
  return <Navigate to={target ? `/w/${target.slug}` : '/services'} replace />;
}
