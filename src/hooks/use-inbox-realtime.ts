import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { env } from '@/config/env';
import { endpoints } from '@/api/endpoints';
import { queryKeys } from '@/api/query-keys';
import { authStore } from '@/stores/auth.store';

type InboxSsePayload = {
  type?: string;
  conversationId?: string;
  reason?: string;
  contactName?: string | null;
  contactPhone?: string | null;
};

/**
 * Local Notification fallback when FCM web client is not configured.
 * With FCM enabled, pushes come from the service worker / onMessage instead.
 */
function fireInboundNotification(
  title: string,
  body: string,
  payload: InboxSsePayload,
) {
  if (env.firebase) return;
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  if (!document.hidden) return;
  const notifBody = payload.contactName ?? payload.contactPhone ?? body;
  new Notification(title, { body: notifBody, icon: '/favicon.ico' });
}

/**
 * Subscribe to workspace inbox SSE. On `inbox.updated`, invalidate conversation
 * list + the affected thread. Returns whether the stream is currently open so
 * polling can back off.
 *
 * EventSource cannot send Authorization — token goes in `access_token` query.
 */
export function useInboxRealtime(slug: string): { connected: boolean } {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const close = () => {
      esRef.current?.close();
      esRef.current = null;
      setConnected(false);
    };

    const connect = () => {
      if (cancelled) return;
      clearTimer();
      close();

      const token = authStore.get().accessToken;
      if (!token) {
        // Wait for bootstrap refresh to mint an access token.
        timerRef.current = setTimeout(connect, 1_000);
        return;
      }

      const url = new URL(
        `${env.apiBaseUrl}${endpoints.messages.events(slug)}`,
      );
      url.searchParams.set('access_token', token);

      const es = new EventSource(url.toString());
      esRef.current = es;

      es.addEventListener('connected', () => {
        if (cancelled) return;
        retryRef.current = 0;
        setConnected(true);
      });

      es.addEventListener('heartbeat', () => {
        if (cancelled) return;
        setConnected(true);
      });

      es.addEventListener('inbox.updated', (ev) => {
        if (cancelled) return;
        let payload: InboxSsePayload = {};
        try {
          payload = JSON.parse((ev as MessageEvent).data as string) as InboxSsePayload;
        } catch {
          /* ignore malformed */
        }

        if (payload.reason === 'inbound') {
          fireInboundNotification(
            t('inbox.notifications.newMessage'),
            t('inbox.notifications.newMessageBody'),
            payload,
          );
        }

        void qc.invalidateQueries({
          queryKey: queryKeys.messages.conversations(slug),
        });
        if (payload.conversationId) {
          void qc.invalidateQueries({
            queryKey: queryKeys.messages.list(slug, payload.conversationId),
          });
        } else {
          void qc.invalidateQueries({
            queryKey: queryKeys.messages.list(slug, ''),
            exact: false,
          });
        }
      });

      // Some browsers only fire generic `message` if `type` isn't used as event name.
      es.onmessage = (ev) => {
        if (cancelled) return;
        let payload: InboxSsePayload = {};
        try {
          payload = JSON.parse(ev.data as string) as InboxSsePayload;
        } catch {
          return;
        }
        if (payload.type === 'connected' || payload.type === 'heartbeat') {
          retryRef.current = 0;
          setConnected(true);
          return;
        }
        if (payload.type === 'inbox.updated') {
          if (payload.reason === 'inbound') {
            fireInboundNotification(
              t('inbox.notifications.newMessage'),
              t('inbox.notifications.newMessageBody'),
              payload,
            );
          }
          void qc.invalidateQueries({
            queryKey: queryKeys.messages.conversations(slug),
          });
          if (payload.conversationId) {
            void qc.invalidateQueries({
              queryKey: queryKeys.messages.list(slug, payload.conversationId),
            });
          }
        }
      };

      es.onerror = () => {
        if (cancelled) return;
        setConnected(false);
        es.close();
        esRef.current = null;
        const attempt = retryRef.current + 1;
        retryRef.current = attempt;
        const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
        timerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !esRef.current) {
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearTimer();
      close();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [slug, qc, t]);

  return { connected };
}
