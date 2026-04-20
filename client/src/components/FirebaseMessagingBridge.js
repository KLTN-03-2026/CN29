import { useEffect } from 'react';
import { useNotification } from './NotificationProvider';
import i18n from '../i18n/config';
import { initFirebaseAnalytics } from '../config/firebase';
import { API_BASE } from '../config/apiBase';
import {
  requestFirebaseMessagingToken,
  subscribeToForegroundMessages
} from '../config/firebaseMessaging';
import { showBrowserNotification } from './notificationUtils';

const readAuthToken = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return String(localStorage.getItem('token') || '').trim();
};

const syncTokenToServer = async (fcmToken, authToken = readAuthToken()) => {
  const token = String(fcmToken || '').trim();
  if (!token || !authToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE}/api/messages/fcm-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ token })
    });

    return response.ok;
  } catch {
    return false;
  }
};

const clearTokenOnServer = async (authToken) => {
  const token = String(authToken || '').trim();
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE}/api/messages/fcm-token`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.ok;
  } catch {
    return false;
  }
};

const resolveNotificationTitle = (payload) => {
  return String(
    payload?.notification?.title
    || payload?.data?.title
    || i18n.t('components.firebaseMessagingBridge.defaultTitle')
  ).trim();
};

const resolveNotificationBody = (payload) => {
  return String(
    payload?.notification?.body
    || payload?.data?.body
    || payload?.data?.message
    || i18n.t('components.firebaseMessagingBridge.defaultBody')
  ).trim();
};

const resolveNotificationUrl = (payload) => {
  const link = String(
    payload?.fcmOptions?.link
    || payload?.data?.url
    || payload?.data?.link
    || '/messages'
  ).trim();

  return link || '/messages';
};

const FirebaseMessagingBridge = () => {
  const { notify } = useNotification();

  useEffect(() => {
    let isUnmounted = false;
    let unsubscribe = () => {};
    let previousAuthToken = readAuthToken();

    const bootstrap = async () => {
      await initFirebaseAnalytics();

      unsubscribe = await subscribeToForegroundMessages(async (payload) => {
        if (isUnmounted) {
          return;
        }

        const title = resolveNotificationTitle(payload);
        const body = resolveNotificationBody(payload);
        const url = resolveNotificationUrl(payload);

        notify({
          type: 'info',
          mode: 'toast',
          title,
          message: body
        });

        await showBrowserNotification({
          title,
          body,
          url,
          tag: String(payload?.messageId || 'jobfinder-fcm')
        });
      });

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const fcmResult = await requestFirebaseMessagingToken();
        if (!isUnmounted && fcmResult?.token) {
          await syncTokenToServer(fcmResult.token);
        }
      }
    };

    const refreshToken = async () => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const fcmResult = await requestFirebaseMessagingToken();
        if (!isUnmounted && fcmResult?.token) {
          await syncTokenToServer(fcmResult.token);
        }
      }
    };

    const onFcmToken = (event) => {
      const nextFcmToken = String(event?.detail?.token || '').trim();
      if (!nextFcmToken || isUnmounted) {
        return;
      }

      void syncTokenToServer(nextFcmToken);
    };

    const authSyncInterval = window.setInterval(() => {
      const nextAuthToken = readAuthToken();
      if (nextAuthToken === previousAuthToken) {
        return;
      }

      const oldAuthToken = previousAuthToken;
      previousAuthToken = nextAuthToken;

      if (!nextAuthToken && oldAuthToken) {
        void clearTokenOnServer(oldAuthToken);
        return;
      }

      if (nextAuthToken && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        void refreshToken();
      }
    }, 1200);

    void bootstrap();

    window.addEventListener('jobfinder:auth-changed', refreshToken);
    window.addEventListener('jobfinder:user-updated', refreshToken);
    window.addEventListener('jobfinder:fcm-token', onFcmToken);

    return () => {
      isUnmounted = true;
      unsubscribe();
      window.clearInterval(authSyncInterval);
      window.removeEventListener('jobfinder:auth-changed', refreshToken);
      window.removeEventListener('jobfinder:user-updated', refreshToken);
      window.removeEventListener('jobfinder:fcm-token', onFcmToken);
    };
  }, [notify]);

  return null;
};

export default FirebaseMessagingBridge;
