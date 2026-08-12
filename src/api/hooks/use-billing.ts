import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingApi, type CreateCheckoutBody } from '@/api/billing.api';
import { queryKeys } from '@/api/query-keys';
import { STALE } from '@/lib/query-client';

/** Current CRM subscription status for the workspace. */
export function useSubscription(slug: string) {
  return useQuery({
    queryKey: queryKeys.billing.subscription(slug),
    queryFn: () => billingApi.getSubscription(slug),
    enabled: slug.length > 0,
    staleTime: STALE.STANDARD,
  });
}

/** Available CRM plans this workspace can upgrade to. */
export function useBillingPlans(slug: string) {
  return useQuery({
    queryKey: queryKeys.billing.plans(slug),
    queryFn: () => billingApi.listPlans(slug),
    enabled: slug.length > 0,
    staleTime: STALE.STATIC,
  });
}

/**
 * Create a Razorpay checkout session and receive the hosted payment URL.
 * The caller should redirect `window.location.href` to `checkoutUrl`.
 */
export function useCreateCheckout(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCheckoutBody) =>
      billingApi.createCheckout(slug, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.billing.subscription(slug),
      });
    },
  });
}
