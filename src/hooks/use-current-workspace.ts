import { useOutletContext } from 'react-router-dom';
import type { CurrentWorkspace } from '@/types/api';

/**
 * The workspace resolved by WorkspaceLayout (passed down via Outlet context).
 * Only valid inside /w/:slug/* pages.
 */
export function useCurrentWorkspace(): CurrentWorkspace {
  return useOutletContext<CurrentWorkspace>();
}
