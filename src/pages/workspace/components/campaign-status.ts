import type { CampaignStatus } from '@/api/campaigns.api';

export const STATUS_VARIANT: Record<
  CampaignStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  DRAFT: 'secondary',
  SCHEDULED: 'outline',
  RUNNING: 'default',
  COMPLETED: 'default',
  PAUSED: 'outline',
  FAILED: 'destructive',
};
