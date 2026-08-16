import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from 'firebase/messaging';
import { env } from '@/config/env';

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (!env.firebase) return null;
  if (!app) {
    app = initializeApp({
      apiKey: env.firebase.apiKey,
      authDomain: env.firebase.authDomain,
      projectId: env.firebase.projectId,
      messagingSenderId: env.firebase.messagingSenderId,
      appId: env.firebase.appId,
    });
  }
  return app;
}

async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (!env.firebase) return null;
  if (!(await isSupported())) return null;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!messaging) messaging = getMessaging(firebaseApp);
  return messaging;
}

export function isFcmClientConfigured(): boolean {
  return !!env.firebase;
}

/**
 * Request notification permission, register the FCM SW, and return a token.
 * Returns null when Firebase env is missing, unsupported, or permission denied.
 */
export async function obtainFcmWebToken(): Promise<string | null> {
  if (!env.firebase) return null;
  if (typeof Notification === 'undefined') return null;

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const msg = await getMessagingIfSupported();
  if (!msg) return null;

  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
    );
    await navigator.serviceWorker.ready;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const sslish =
      /ssl|certificate|secure|net::err_cert/i.test(detail) ||
      (err instanceof DOMException && err.name === 'SecurityError');
    if (sslish) {
      throw new Error(
        'Service worker blocked by untrusted HTTPS. Use mkcert for localhost, or tunnel the client with ngrok (trusted cert). Plain http://localhost also works for FCM, but Meta Embedded Signup needs HTTPS.',
      );
    }
    throw err instanceof Error ? err : new Error(detail);
  }

  return getToken(msg, {
    vapidKey: env.firebase.vapidKey,
    serviceWorkerRegistration: registration,
  });
}

/** Foreground messages while the tab is open (background uses the SW). */
export async function listenFcmForeground(
  handler: (payload: {
    title?: string;
    body?: string;
    data?: Record<string, string>;
  }) => void,
): Promise<() => void> {
  const msg = await getMessagingIfSupported();
  if (!msg) return () => {};

  return onMessage(msg, (payload) => {
    handler({
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: payload.data as Record<string, string> | undefined,
    });
  });
}
