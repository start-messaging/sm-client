/**
 * Serves `/fcm-firebase-config.json` from Vite env so the FCM service worker
 * (compat scripts in /public) can initialize with the same Firebase web config.
 */
import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

function readFirebaseWebConfig(): Record<string, string> | null {
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const messagingSenderId = process.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.VITE_FIREBASE_APP_ID;
  if (!apiKey || !projectId || !messagingSenderId || !appId) return null;
  return {
    apiKey,
    authDomain:
      process.env.VITE_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket:
      process.env.VITE_FIREBASE_STORAGE_BUCKET ?? `${projectId}.appspot.com`,
    messagingSenderId,
    appId,
  };
}

export function fcmFirebaseConfigPlugin(): Plugin {
  const serve = (
    req: { url?: string },
    res: {
      setHeader: (k: string, v: string) => void;
      end: (body: string) => void;
      statusCode: number;
    },
    next: () => void,
  ) => {
    if (!req.url?.startsWith('/fcm-firebase-config.json')) {
      next();
      return;
    }
    const config = readFirebaseWebConfig();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    if (!config) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'firebase_not_configured' }));
      return;
    }
    res.end(JSON.stringify(config));
  };

  return {
    name: 'fcm-firebase-config',
    configureServer(server) {
      server.middlewares.use(serve);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve);
    },
    writeBundle(outputOptions) {
      const config = readFirebaseWebConfig();
      if (!config || !outputOptions.dir) return;
      fs.writeFileSync(
        path.join(outputOptions.dir, 'fcm-firebase-config.json'),
        JSON.stringify(config),
      );
    },
  };
}
