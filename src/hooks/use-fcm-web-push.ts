import { useCallback, useEffect, useState } from 'react';
import { fcmPushApi, loadStoredFcmToken, storeFcmToken } from '@/api/fcm-push.api';
import {
  isFcmClientConfigured,
  listenFcmForeground,
  obtainFcmWebToken,
} from '@/lib/fcm';
import { toast } from '@/lib/toast';

function getNotifPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/**
 * Enables FCM web push for the signed-in user: permission → token → register
 * with sm-server. Falls back to browser Notification-only when Firebase env
 * is missing (server may still be FCM-disabled).
 */
export function useFcmWebPush(options?: {
  /** i18n title/body for foreground notifications when the tab is hidden. */
  foregroundTitle?: string;
  foregroundBody?: string;
}) {
  const [permission, setPermission] = useState<
    NotificationPermission | 'unsupported'
  >(getNotifPermission);
  const [registering, setRegistering] = useState(false);
  const [tokenRegistered, setTokenRegistered] = useState(
    () => !!loadStoredFcmToken(),
  );
  const fcmConfigured = isFcmClientConfigured();

  useEffect(() => {
    setPermission(getNotifPermission());
  }, []);

  // If OS permission is already granted, ensure we have a live FCM token on
  // the server (previous SW/SSL failures may have left only a soft-deleted row).
  useEffect(() => {
    if (!fcmConfigured) return;
    if (getNotifPermission() !== 'granted') return;
    let cancelled = false;
    void (async () => {
      setRegistering(true);
      try {
        const token = await obtainFcmWebToken();
        if (cancelled || !token) return;
        await fcmPushApi.register(token);
        storeFcmToken(token);
        setTokenRegistered(true);
      } catch {
        /* toast only on explicit Enable click */
      } finally {
        if (!cancelled) setRegistering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fcmConfigured]);

  // Foreground FCM: show OS notification only when the tab is not visible
  // (avoids doubling with the open inbox UI).
  useEffect(() => {
    if (!fcmConfigured || permission !== 'granted') return;
    let unsub: (() => void) | undefined;
    void listenFcmForeground((payload) => {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') return;
      if (!document.hidden) return;
      new Notification(
        payload.title ?? options?.foregroundTitle ?? 'New WhatsApp message',
        {
          body:
            payload.body ??
            options?.foregroundBody ??
            'You have a new message in your inbox.',
          icon: '/favicon.ico',
          tag: payload.data?.conversationId
            ? `inbox-${payload.data.conversationId}`
            : undefined,
        },
      );
    }).then((u) => {
      unsub = u;
    });
    return () => {
      unsub?.();
    };
  }, [
    fcmConfigured,
    permission,
    options?.foregroundTitle,
    options?.foregroundBody,
  ]);

  const enable = useCallback(async () => {
    setRegistering(true);
    try {
      if (!fcmConfigured) {
        if (typeof Notification === 'undefined') return;
        const result = await Notification.requestPermission();
        setPermission(result);
        return;
      }

      const token = await obtainFcmWebToken();
      setPermission(getNotifPermission());
      if (!token) {
        toast.error('Could not enable push notifications in this browser.');
        return;
      }
      await fcmPushApi.register(token);
      storeFcmToken(token);
      setTokenRegistered(true);
      toast.success('Push notifications enabled for this browser.');
    } catch (err) {
      toast.error(err);
    } finally {
      setRegistering(false);
    }
  }, [fcmConfigured]);

  return {
    permission,
    registering,
    tokenRegistered,
    fcmConfigured,
    enable,
  };
}
