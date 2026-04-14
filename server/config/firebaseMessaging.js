const { GoogleAuth } = require('google-auth-library');

const FIREBASE_PROJECT_ID = String(process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '').trim();
const FIREBASE_CLIENT_EMAIL = String(process.env.FIREBASE_CLIENT_EMAIL || '').trim();
const FIREBASE_PRIVATE_KEY = String(process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();

let authClientPromise = null;

const hasFirebaseMessagingConfig = () => {
  return Boolean(FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY);
};

const getAuthClient = async () => {
  if (!hasFirebaseMessagingConfig()) {
    return null;
  }

  if (!authClientPromise) {
    authClientPromise = (async () => {
      const auth = new GoogleAuth({
        credentials: {
          client_email: FIREBASE_CLIENT_EMAIL,
          private_key: FIREBASE_PRIVATE_KEY
        },
        scopes: ['https://www.googleapis.com/auth/firebase.messaging']
      });

      return auth.getClient();
    })().catch((error) => {
      authClientPromise = null;
      throw error;
    });
  }

  return authClientPromise;
};

const getAccessToken = async () => {
  const authClient = await getAuthClient();
  if (!authClient) {
    return '';
  }

  const tokenValue = await authClient.getAccessToken();
  const accessToken = typeof tokenValue === 'string' ? tokenValue : tokenValue?.token;
  return String(accessToken || '').trim();
};

const toStringDataMap = (raw = {}) => {
  return Object.entries(raw || {}).reduce((acc, [key, value]) => {
    if (value == null) {
      return acc;
    }

    acc[String(key)] = String(value);
    return acc;
  }, {});
};

const sendFirebaseMessageToToken = async ({ token, title, body, data = {} }) => {
  const fcmToken = String(token || '').trim();
  if (!fcmToken) {
    return { sent: false, reason: 'missing-token' };
  }

  if (!hasFirebaseMessagingConfig()) {
    return { sent: false, reason: 'missing-config' };
  }

  if (typeof fetch !== 'function') {
    return { sent: false, reason: 'fetch-unavailable' };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { sent: false, reason: 'missing-access-token' };
  }

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        notification: {
          title: String(title || 'JobFinder notification').trim(),
          body: String(body || '').trim()
        },
        data: toStringDataMap(data),
        webpush: {
          notification: {
            icon: '/pwa-192x192.png',
            badge: '/favicon-32x32.png'
          }
        }
      }
    })
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    throw new Error(`FCM send failed (${response.status}): ${responseText.slice(0, 400)}`);
  }

  return { sent: true };
};

module.exports = {
  hasFirebaseMessagingConfig,
  sendFirebaseMessageToToken
};
