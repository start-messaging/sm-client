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

export const STATUS_PILL: Record<CampaignStatus, { bg: string; text: string }> =
  {
    DRAFT: { bg: 'bg-[#f4f4f5]', text: 'text-[#71717a]' },
    SCHEDULED: { bg: 'bg-[#e0f2fe]', text: 'text-[#0284c7]' },
    RUNNING: { bg: 'bg-[#dcfce7]', text: 'text-[#16a34a]' },
    COMPLETED: { bg: 'bg-[#f4f4f5]', text: 'text-[#18181b]' },
    PAUSED: { bg: 'bg-[#fef3c7]', text: 'text-[#d97706]' },
    FAILED: { bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]' },
  };
