import { apiGet } from '@/lib/http';
import { endpoints } from '@/api/endpoints';
import type { PublicCountry } from '@/types/api';

export const countriesApi = {
  /** Active countries (lean shape) — the onboarding phone picker. */
  list: () => apiGet<PublicCountry[]>(endpoints.countries.list),
};
