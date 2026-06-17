import { Navigate, useParams } from 'react-router-dom';

/**
 * Unknown module segments under /w/:slug (stale bookmarks, hand-typed or
 * not-yet-built paths) fall back to the workspace dashboard. An explicit
 * absolute target — `<Navigate to=".">` resolves to the CURRENT splat URL in
 * react-router v7 and silently renders nothing.
 */
export function WorkspaceCatchAll() {
  const { slug } = useParams();
  return <Navigate to={`/w/${slug}`} replace />;
}
