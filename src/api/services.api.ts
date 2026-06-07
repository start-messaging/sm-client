import { apiGet } from '@/lib/http';
import { endpoints } from '@/api/endpoints';
import type { Service } from '@/types/api';

export const servicesApi = {
  /** Public catalogue (ACTIVE services only) — powers onboarding. */
  listActive: () => apiGet<Service[]>(endpoints.services.list),
};
