import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Layers,
  Link2,
  MinusCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type { WabaConnectionStatus } from '@/api/whatsapp.api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import {
  useWabaStatus,
  useConnectWhatsApp,
  useRegisterPhone,
  useSyncWhatsApp,
} from '@/api/hooks/use-whatsapp';
import { env } from '@/config/env';
import { toast } from '@/lib/toast';
import type { ConnectWhatsAppBody } from '@/api/whatsapp.api';
import { cn } from '@/lib/utils';

// ── FB SDK type augments ────────────────────────────────────────────────────

declare global {
  interface Window {
    FB?: {
      init: (opts: object) => void;
      login: (
        cb: (response: { authResponse?: { code: string } }) => void,
        opts: object,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

// ── ES v4 sessionInfo captured via window.message ───────────────────────────

interface EsSessionInfo {
  wabaId: string;
  phoneNumberId: string;
}

function useFbSdk(): boolean {
  const [ready, setReady] = useState(typeof window.FB !== 'undefined');

  useEffect(() => {
    if (ready) return;
    if (!env.meta.appId) return;

    window.fbAsyncInit = () => {
      window.FB!.init({
        appId: env.meta.appId,
        cookie: true,
        xfbml: false,
        version: env.meta.graphVersion,
      });
      setReady(true);
    };

    if (document.getElementById('facebook-jssdk')) return;
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, [ready]);

  return ready;
}

function useEsSessionCapture() {
  const ref = useRef<EsSessionInfo | null>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type !== 'WA_EMBEDDED_SIGNUP') return;
      const d = e.data.data as Record<string, unknown> | undefined;
      const wabaId = d?.waba_id;
      const phoneNumberId = d?.phone_number_id;
      if (typeof wabaId === 'string' && typeof phoneNumberId === 'string') {
        ref.current = { wabaId, phoneNumberId };
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return ref;
}

function launchEmbeddedSignup(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!window.FB) {
      resolve(null);
      return;
    }
    window.FB.login(
      (response) => resolve(response.authResponse?.code ?? null),
      {
        config_id: env.meta.embeddedSignupConfigId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '3',
        },
      },
    );
  });
}

// ── PIN retry dialog ────────────────────────────────────────────────────────

function PinDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (pin: string) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPin('');
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('connect.pin.title')}</DialogTitle>
          <DialogDescription>{t('connect.pin.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <InputOTP
            maxLength={6}
            value={pin}
            onChange={setPin}
            onComplete={(v) => onSubmit(v)}
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            disabled={pin.length !== 6 || isPending}
            onClick={() => onSubmit(pin)}
          >
            {isPending && <Spinner />}
            {t('connect.pin.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Connected card ──────────────────────────────────────────────────────────

function ConnectedCard({
  status,
  onManage,
  onSync,
  syncing,
}: {
  status: WabaConnectionStatus;
  onManage: () => void;
  onSync: () => void;
  syncing: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-4 rounded-[10px] border border-[#e4e4e7] bg-white p-5">
      {/* Green circle icon */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#dcfce7]">
        <CheckCircle2 className="size-5 text-[#16a34a]" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#18181b] leading-snug">
          {status.displayName ?? t('connect.title')}
        </p>
        {status.phoneNumber && (
          <p className="text-[13px] text-[#71717a] mt-0.5">
            {status.phoneNumber}
          </p>
        )}
        {status.wabaId && (
          <p className="text-[12px] text-[#a1a1aa] mt-1">
            WABA: {status.wabaId}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-[12px] text-[#71717a] hover:text-[#18181b]"
          disabled={syncing}
          onClick={onSync}
        >
          <RefreshCw
            className={cn('mr-1 size-3.5', syncing && 'animate-spin')}
          />
          {t('connect.sync.cta')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-[12px]"
          onClick={onManage}
        >
          {t('connect.ctaConnected')}
        </Button>
      </div>
    </div>
  );
}

// ── Not-connected card ───────────────────────────────────────────────────────

function NotConnectedCard({
  onConnect,
  onSync,
  launching,
  syncing,
  fbReady,
}: {
  onConnect: () => void;
  onSync: () => void;
  launching: boolean;
  syncing: boolean;
  fbReady: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-4 rounded-[10px] border border-[#e4e4e7] bg-white p-5">
      {/* Gray circle */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5]">
        <Link2 className="size-5 text-[#a1a1aa]" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#18181b]">
          {t('connect.title')}
        </p>
        <p className="text-[13px] text-[#71717a] mt-0.5">
          {t('connect.subtitle')}
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          {env.meta.appId ? (
            <Button
              size="sm"
              onClick={onConnect}
              disabled={launching || !fbReady}
              className="bg-[#18181b] text-white hover:bg-[#27272a] text-[12px]"
            >
              {launching && <Spinner className="mr-1.5" />}
              <Link2 className="mr-1.5 size-3.5" />
              {t('connect.cta')}
            </Button>
          ) : (
            <p className="text-[12px] text-[#a1a1aa]">
              {t('connect.sdkNotReady')}
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[12px] text-[#71717a]"
            disabled={syncing}
            onClick={onSync}
          >
            <RefreshCw
              className={cn('mr-1 size-3.5', syncing && 'animate-spin')}
            />
            {t('connect.sync.cta')}
          </Button>
        </div>
        <p className="text-[11px] text-[#a1a1aa] mt-2">
          {t('connect.sync.hint')}
        </p>
      </div>
    </div>
  );
}

// ── Payment status card ──────────────────────────────────────────────────────

function PaymentStatusCard({ ready }: { ready: boolean | null }) {
  if (ready === true) {
    return (
      <div className="flex items-center gap-2.5 rounded-[8px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-2.5">
        <CheckCircle2 className="size-4 shrink-0 text-[#16a34a]" />
        <span className="text-[13px] font-medium text-[#15803d]">
          Payment method active
        </span>
      </div>
    );
  }

  if (ready === null) {
    return (
      <div className="flex items-center gap-2.5 rounded-[8px] border border-[#fcd34d] bg-[#fefce8] px-4 py-2.5">
        <AlertTriangle className="size-4 shrink-0 text-[#d97706]" />
        <span className="text-[13px] text-[#92400e]">
          Payment status unknown — click Sync to check
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 rounded-[10px] border border-[#fcd34d] bg-white p-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fef3c7]">
        <AlertTriangle className="size-5 text-[#d97706]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#18181b]">
          No payment method
        </p>
        <p className="text-[13px] text-[#71717a] mt-0.5">
          No payment method on your WhatsApp Business Account. Template messages
          will fail. Add a payment method in Meta Business Manager.
        </p>
        <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-[12px] px-0 gap-1 text-[#18181b]"
            asChild
          >
            <a
              href="https://business.facebook.com/settings/payment-methods"
              target="_blank"
              rel="noopener noreferrer"
            >
              Add payment method
              <ExternalLink className="size-3" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function AnotherWabaCard() {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-4 rounded-[10px] border border-[#e4e4e7] bg-white p-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5]">
        <Layers className="size-5 text-[#52525b]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-[#18181b]">
          {t('connect.anotherWaba.title')}
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-[#71717a]">
          {t('connect.anotherWaba.body')}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 text-[12px]"
          asChild
        >
          <Link to="/services/whatsapp/new">
            {t('connect.anotherWaba.cta')}
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ── PIN pending card ─────────────────────────────────────────────────────────

function PinPendingCard({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-4 rounded-[10px] border border-[#fcd34d] bg-white p-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fef3c7]">
        <AlertTriangle className="size-5 text-[#d97706]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#18181b]">
          {t('connect.pin.pendingTitle')}
        </p>
        <p className="text-[13px] text-[#71717a] mt-0.5">
          {t('connect.pin.pendingBody')}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 text-[12px]"
          onClick={onOpen}
        >
          {t('connect.pin.openCta')}
        </Button>
      </div>
    </div>
  );
}

// ── WABA health card ────────────────────────────────────────────────────────

function qualityPill(rating: string | null) {
  switch (rating?.toUpperCase()) {
    case 'GREEN':
      return { bg: 'bg-[#dcfce7]', text: 'text-[#16a34a]' };
    case 'YELLOW':
      return { bg: 'bg-[#fef3c7]', text: 'text-[#d97706]' };
    case 'RED':
      return { bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]' };
    default:
      return { bg: 'bg-[#f4f4f5]', text: 'text-[#71717a]' };
  }
}

function WabaHealthCard({ status }: { status: WabaConnectionStatus }) {
  const { t } = useTranslation();

  const hasAnySignal =
    status.accountReviewStatus ||
    status.businessVerificationStatus ||
    status.messagingLimitPerDay !== null ||
    status.qualityRating;

  if (!hasAnySignal) return null;

  const qPill = qualityPill(status.qualityRating);
  const isVerified =
    status.businessVerificationStatus?.toLowerCase() === 'verified';

  return (
    <div className="rounded-[10px] border border-[#e4e4e7] bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="size-4 text-[#a1a1aa]" />
        <p className="text-[13px] font-semibold text-[#18181b]">
          {t('connect.health.title')}
        </p>
        <p className="text-[12px] text-[#a1a1aa]">
          {t('connect.health.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
        {status.messagingLimitPerDay !== null && (
          <div>
            <p className="text-[11px] font-medium text-[#a1a1aa] mb-1">
              {t('connect.health.dailyLimit')}
            </p>
            <p className="text-[13px] font-semibold text-[#18181b]">
              {status.messagingLimitPerDay === -1
                ? t('connect.health.unlimited')
                : status.messagingLimitPerDay.toLocaleString()}
            </p>
          </div>
        )}
        {status.qualityRating && (
          <div>
            <p className="text-[11px] font-medium text-[#a1a1aa] mb-1">
              {t('connect.health.qualityRating')}
            </p>
            <span
              className={cn(
                'text-[10px] font-semibold px-[6px] py-px rounded-full',
                qPill.bg,
                qPill.text,
              )}
            >
              {status.qualityRating}
            </span>
          </div>
        )}
        {status.businessVerificationStatus && (
          <div>
            <p className="text-[11px] font-medium text-[#a1a1aa] mb-1">
              {t('connect.health.bizVerification')}
            </p>
            <div className="flex items-center gap-1">
              {isVerified ? (
                <CheckCircle2 className="size-3.5 text-[#16a34a]" />
              ) : (
                <MinusCircle className="size-3.5 text-[#a1a1aa]" />
              )}
              <span className="text-[13px] font-medium text-[#18181b]">
                {status.businessVerificationStatus}
              </span>
            </div>
          </div>
        )}
        {status.accountReviewStatus && (
          <div>
            <p className="text-[11px] font-medium text-[#a1a1aa] mb-1">
              {t('connect.health.accountReview')}
            </p>
            <p className="text-[13px] font-semibold text-[#18181b]">
              {status.accountReviewStatus}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export function ConnectPage() {
  const { t } = useTranslation();
  const ws = useCurrentWorkspace();
  const { data: wabaStatus, isLoading } = useWabaStatus(ws.slug);
  const connectWaba = useConnectWhatsApp(ws.slug);
  const registerPhone = useRegisterPhone(ws.slug);
  const syncWaba = useSyncWhatsApp(ws.slug);
  const fbReady = useFbSdk();
  const sessionRef = useEsSessionCapture();

  const [launching, setLaunching] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  const isConnected = wabaStatus?.status === 'connected';
  const needsPhonePin = !!wabaStatus?.phoneRegistrationPending;

  async function postConnect(body: ConnectWhatsAppBody) {
    const result = await connectWaba.mutateAsync(body, {
      onError: (err) => toast.error(err),
    });
    toast.success(t('connect.connected.title'));
    if (result.phoneRegistrationPending) {
      setPinOpen(true);
    }
  }

  async function handleConnect() {
    if (!fbReady || !env.meta.appId) {
      toast.error(t('connect.sdkNotReady'));
      return;
    }
    setLaunching(true);
    try {
      const code = await launchEmbeddedSignup();
      if (!code) return;
      const session = sessionRef.current;
      const body: ConnectWhatsAppBody = {
        code,
        ...(session
          ? { wabaId: session.wabaId, phoneNumberId: session.phoneNumberId }
          : {}),
      };
      await postConnect(body);
    } finally {
      setLaunching(false);
    }
  }

  async function handlePinSubmit(pin: string) {
    await registerPhone.mutateAsync(pin, {
      onSuccess: () => {
        toast.success(t('connect.pin.registered'));
        setPinOpen(false);
      },
      onError: (err) => toast.error(err),
    });
  }

  function handleSync() {
    syncWaba.mutate(undefined, {
      onSuccess: (status) => {
        toast.success(
          status.status === 'connected'
            ? t('connect.sync.stillConnected')
            : t('connect.sync.updated'),
        );
      },
      onError: (err) => toast.error(err),
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-[#71717a]">
        <Spinner className="size-4" />
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-[720px]">
      {isConnected ? (
        <ConnectedCard
          status={wabaStatus}
          onManage={() => void handleConnect()}
          onSync={handleSync}
          syncing={syncWaba.isPending}
        />
      ) : (
        <NotConnectedCard
          onConnect={() => void handleConnect()}
          onSync={handleSync}
          launching={launching || connectWaba.isPending}
          syncing={syncWaba.isPending}
          fbReady={fbReady}
        />
      )}

      {isConnected && needsPhonePin && (
        <PinPendingCard onOpen={() => setPinOpen(true)} />
      )}

      {isConnected && (
        <PaymentStatusCard ready={wabaStatus.metaPaymentReady} />
      )}

      {isConnected && <WabaHealthCard status={wabaStatus} />}

      <AnotherWabaCard />

      <PinDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        onSubmit={(pin) => void handlePinSubmit(pin)}
        isPending={registerPhone.isPending}
      />
    </div>
  );
}
