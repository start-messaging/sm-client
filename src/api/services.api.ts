import { apiGet } from '@/lib/http';
import { endpoints } from '@/api/endpoints';
import type { PublicService } from '@/types/api';

export const servicesApi = {
  /** Services available (priced) in the authenticated user's country. */
  listAvailable: () => apiGet<PublicService[]>(endpoints.services.list),
};
