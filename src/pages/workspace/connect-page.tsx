import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Link2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { EducationSlot } from '@/components/education/education-slot';
import { useCurrentWorkspace } from '@/hooks/use-current-workspace';
import { useWabaStatus, useConnectWhatsApp, useRegisterPhone, useSyncWhatsApp } from '@/api/hooks/use-whatsapp';
import { env } from '@/config/env';
import { toast } from '@/lib/toast';
import type { ConnectWhatsAppBody } from '@/api/whatsapp.api';

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

/**
 * Listen for the ES v4 `WA_EMBEDDED_SIGNUP` window message.
 * Meta's popup posts this before the FB.login callback fires, containing
 * `data.waba_id` and `data.phone_number_id`. We capture it into a ref
 * so the connect handler can include it as optional hint fields.
 */
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
          // Match Embedded Signup Builder "Session Info Version" (v3 payload).
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button disabled={pin.length !== 6 || isPending} onClick={() => onSubmit(pin)}>
            {isPending && <Spinner />}
            {t('connect.pin.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      onError: (err) => {
        toast.error(err);
      },
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
      if (!code) return; // user closed popup

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('connect.title')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('connect.subtitle')}</p>
      </div>

      <EducationSlot
        title={t('connect.intro.title')}
        body={
          <>
            <span>{t('connect.intro.body')}</span>
            <br /><br />
            <span className="font-medium">{t('connect.intro.metaBillingNote')}</span>
          </>
        }
        docsUrl="https://developers.facebook.com/docs/whatsapp/embedded-signup"
      />

      {/* Connection status card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">
                {isConnected
                  ? (wabaStatus.displayName ?? t('connect.title'))
                  : t('connect.title')}
              </CardTitle>
              {isConnected && wabaStatus.phoneNumber && (
                <CardDescription>{wabaStatus.phoneNumber}</CardDescription>
              )}
            </div>
            {!isLoading && (
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnected
                  ? t('connect.status.connected')
                  : t('connect.status.notConnected')}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {isConnected && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="size-4" />
              {t('connect.connected.body')}
            </div>
          )}

          {isConnected && needsPhonePin && (
            <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
              <p className="text-sm font-medium">{t('connect.pin.pendingTitle')}</p>
              <p className="text-muted-foreground text-xs">
                {t('connect.pin.pendingBody')}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-fit"
                onClick={() => setPinOpen(true)}
              >
                {t('connect.pin.openCta')}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {env.meta.appId ? (
              <Button
                onClick={() => void handleConnect()}
                disabled={launching || connectWaba.isPending || !fbReady}
                className="w-fit"
              >
                {(launching || connectWaba.isPending) && <Spinner />}
                <Link2 className="mr-2 size-4" />
                {isConnected ? t('connect.ctaConnected') : t('connect.cta')}
              </Button>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t('connect.sdkNotReady')}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="default"
              className="w-fit"
              disabled={syncWaba.isPending || isLoading}
              onClick={handleSync}
            >
              <RefreshCw
                className={`mr-1.5 size-3.5 ${syncWaba.isPending ? 'animate-spin' : ''}`}
              />
              {t('connect.sync.cta')}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">{t('connect.sync.hint')}</p>
        </CardContent>
      </Card>

      <PinDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        onSubmit={(pin) => void handlePinSubmit(pin)}
        isPending={registerPhone.isPending}
      />

      {/* Meta payment education — only shown once connected */}
      {isConnected && (
        <>
          <Separator />
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-base">
                {t('connect.metaPayChecklist.title')}
              </CardTitle>
              <CardDescription className="text-foreground/80">
                {t('connect.metaPayChecklist.body')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <Button variant="outline" size="sm" asChild className="w-fit">
                <a
                  href="https://business.facebook.com/billing_hub/accounts"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('connect.metaPayChecklist.cta')}
                </a>
              </Button>
              <p className="text-muted-foreground text-xs">
                {t('connect.metaPayChecklist.note')}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
