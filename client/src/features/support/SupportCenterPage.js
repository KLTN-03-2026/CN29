import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { requestBrowserNotificationPermission } from '../../components/notificationUtils';
import { useNotification } from '../../components/NotificationProvider';
import { API_BASE as CLIENT_API_BASE } from '../../config/apiBase';
import './SupportCenterPage.css';

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[đĐ]/g, 'd')
  .toLowerCase()
  .trim();

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const toTimestamp = (value) => {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const formatDateTime = (value, t) => {
  if (!value) return t('supportCenterPage.time.justNow');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('supportCenterPage.time.justNow');
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const FEED_TYPE_TRANSLATION_KEYS = {
  message: 'supportCenterPage.feedTypes.message',
  'application-received': 'supportCenterPage.feedTypes.applicationReceived',
  'application-accepted': 'supportCenterPage.feedTypes.applicationAccepted',
  'application-update': 'supportCenterPage.feedTypes.applicationUpdate',
  'application-review': 'supportCenterPage.feedTypes.applicationReview',
  'application-offer': 'supportCenterPage.feedTypes.applicationOffer',
  'application-rejected': 'supportCenterPage.feedTypes.applicationRejected',
  'interview-invite': 'supportCenterPage.feedTypes.interviewInvite',
  'company-comment': 'supportCenterPage.feedTypes.companyComment',
  'company-rating': 'supportCenterPage.feedTypes.companyRating'
};

const trimText = (value, max = 180) => {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3))}...`;
};

const normalizeRoleName = (user) => normalizeText(
  user?.role
  || user?.VaiTro
  || user?.vaiTro
  || user?.LoaiNguoiDung
  || ''
);

const resolveCandidateStatusMeta = (statusValue, t) => {
  const normalized = normalizeText(statusValue);
  if (normalized === 'phong van') {
    return {
      type: 'interview-invite',
      title: t('supportCenterPage.feed.titles.interviewInvite'),
      label: buildFeedTypeLabel('interview-invite', t)
    };
  }
  if (normalized === 'da nhan') {
    return {
      type: 'application-accepted',
      title: t('supportCenterPage.feed.titles.applicationAccepted'),
      label: buildFeedTypeLabel('application-accepted', t)
    };
  }
  if (normalized === 'dang xem xet') {
    return {
      type: 'application-review',
      title: t('supportCenterPage.feed.titles.applicationReview'),
      label: buildFeedTypeLabel('application-review', t)
    };
  }
  if (normalized === 'de nghi') {
    return {
      type: 'application-offer',
      title: t('supportCenterPage.feed.titles.applicationOffer'),
      label: buildFeedTypeLabel('application-offer', t)
    };
  }
  if (normalized === 'tu choi') {
    return {
      type: 'application-rejected',
      title: t('supportCenterPage.feed.titles.applicationRejected'),
      label: buildFeedTypeLabel('application-rejected', t)
    };
  }
  return {
    type: 'application-update',
    title: t('supportCenterPage.feed.titles.applicationUpdate'),
    label: buildFeedTypeLabel('application-update', t)
  };
};

const buildFeedTypeLabel = (type, t) => t(FEED_TYPE_TRANSLATION_KEYS[type] || 'supportCenterPage.feedTypes.default');

const buildMessageLink = (normalizedRole) => {
  if (normalizedRole === 'nha tuyen dung') return '/employer/messages';
  if (normalizedRole === 'ung vien') return '/messages';
  return '/login';
};

const SupportCenterPage = () => {
  const API_BASE = CLIENT_API_BASE;
  const { t } = useTranslation();
  const { notify } = useNotification();
  const [currentUser, setCurrentUser] = useState(() => readStoredUser());
  const [token, setToken] = useState(() => String(localStorage.getItem('token') || '').trim());
  const [permissionState, setPermissionState] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState('');
  const [notificationFeed, setNotificationFeed] = useState([]);
  const [privateFeedDenied, setPrivateFeedDenied] = useState(false);
  const loadingInFlightRef = useRef(false);
  const lastRefreshAtRef = useRef(0);

  const normalizedRole = normalizeRoleName(currentUser);
  const messageLink = buildMessageLink(normalizedRole);
  const canReadPrivateNotifications = normalizedRole === 'nha tuyen dung' || normalizedRole === 'ung vien';
  const isLoggedIn = Boolean(token);
  const notificationsEnabled = permissionState === 'granted';

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermissionState(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, []);

  useEffect(() => {
    const syncAuth = (event) => {
      if (event?.detail && typeof event.detail === 'object') {
        setCurrentUser(event.detail);
      } else {
        setCurrentUser(readStoredUser());
      }
      setToken(String(localStorage.getItem('token') || '').trim());
    };

    window.addEventListener('storage', syncAuth);
    window.addEventListener('jobfinder:user-updated', syncAuth);

    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('jobfinder:user-updated', syncAuth);
    };
  }, []);

  useEffect(() => {
    setPrivateFeedDenied(false);
    loadingInFlightRef.current = false;
    lastRefreshAtRef.current = 0;
  }, [token, normalizedRole]);

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const shouldSkipRefresh = (reason) => {
      if (reason === 'interval') return false;
      const now = Date.now();
      return now - lastRefreshAtRef.current < 1800;
    };

    const loadNotifications = async (reason = 'manual') => {
      if (loadingInFlightRef.current) return;

      if (!token || !canReadPrivateNotifications) {
        setNotificationFeed([]);
        setFeedError('');
        setFeedLoading(false);
        return;
      }

      if (privateFeedDenied) {
        setFeedLoading(false);
        return;
      }

      if (shouldSkipRefresh(reason)) {
        return;
      }

      loadingInFlightRef.current = true;
      lastRefreshAtRef.current = Date.now();
      setFeedLoading(true);
      setFeedError('');

      try {
        const headers = { Authorization: `Bearer ${token}` };

        const inboxPromise = fetch(`${API_BASE}/api/messages/inbox`, { headers })
          .then(async (response) => {
            const payload = await response.json().catch(() => ({ success: false, inbox: [] }));
            return { status: response.status, payload };
          })
          .catch(() => ({ status: 0, payload: { success: false, inbox: [] } }));

        const applicationsPromise = normalizedRole === 'ung vien'
          ? fetch(`${API_BASE}/applications/mine`, { headers })
            .then(async (response) => {
              const payload = await response.json().catch(() => []);
              return { status: response.status, payload };
            })
            .catch(() => ({ status: 0, payload: [] }))
          : normalizedRole === 'nha tuyen dung'
            ? fetch(`${API_BASE}/applications`, { headers })
              .then(async (response) => {
                const payload = await response.json().catch(() => []);
                return { status: response.status, payload };
              })
              .catch(() => ({ status: 0, payload: [] }))
            : Promise.resolve({ status: 200, payload: [] });

        const employerReviewPromise = normalizedRole === 'nha tuyen dung'
          ? fetch(`${API_BASE}/api/companies/me/reviews`, { headers })
            .then(async (response) => {
              const payload = await response.json().catch(() => ({ success: false, comments: [], recentRatings: [] }));
              return { status: response.status, payload };
            })
            .catch(() => ({ status: 0, payload: { success: false, comments: [], recentRatings: [] } }))
          : Promise.resolve({ status: 200, payload: { success: false, comments: [], recentRatings: [] } });

        const [inboxResult, applicationsResult, employerReviewResult] = await Promise.all([
          inboxPromise,
          applicationsPromise,
          employerReviewPromise
        ]);
        if (cancelled) return;

        const hasAccessDenied = [inboxResult, applicationsResult, employerReviewResult]
          .some((result) => Number(result?.status) === 401 || Number(result?.status) === 403);

        if (hasAccessDenied) {
          setPrivateFeedDenied(true);
          setNotificationFeed([]);
          setFeedError(t('supportCenterPage.empty.privateAccessDenied'));
          return;
        }

        const inboxRows = Array.isArray(inboxResult?.payload?.inbox) ? inboxResult.payload.inbox : [];
        const messageNotifications = inboxRows
          .map((row, index) => ({
            id: `msg-${row?.userId || index}`,
            type: 'message',
            typeLabel: buildFeedTypeLabel('message', t),
            title: Number(row?.unread || 0) > 0
              ? t('supportCenterPage.feed.messages.titleUnread', {
                count: Number(row?.unread || 0),
                name: row?.name || t('supportCenterPage.feed.defaults.user')
              })
              : t('supportCenterPage.feed.messages.title', {
                name: row?.name || t('supportCenterPage.feed.defaults.user')
              }),
            description: t('supportCenterPage.feed.messages.description', {
              name: row?.name || t('supportCenterPage.feed.defaults.user')
            }),
            createdAt: row?.lastAt || '',
            timestamp: toTimestamp(row?.lastAt),
            badgeCount: Number(row?.unread || 0),
            actionLabel: t('supportCenterPage.feed.actions.openConversation'),
            actionTo: messageLink
          }));

        const appRows = Array.isArray(applicationsResult?.payload) ? applicationsResult.payload : [];
        const candidateApplicationNotifications = normalizedRole === 'ung vien'
          ? appRows
            .map((row, index) => {
              const statusMeta = resolveCandidateStatusMeta(row?.TrangThai || row?.status, t);
              const statusText = String(row?.TrangThai || row?.status || '').trim();
              const companyName = String(row?.TenCongTy || t('supportCenterPage.feed.defaults.company')).trim() || t('supportCenterPage.feed.defaults.company');
              const jobTitle = String(row?.TieuDe || t('supportCenterPage.feed.defaults.appliedPosition')).trim() || t('supportCenterPage.feed.defaults.appliedPosition');
              return {
                id: `candidate-app-${row?.MaUngTuyen || row?.MaTin || index}`,
                type: statusMeta.type,
                typeLabel: statusMeta.label,
                title: statusMeta.title,
                description: t('supportCenterPage.feed.candidateApplication.description', {
                  companyName,
                  jobTitle,
                  statusText: statusText ? ` (${statusText})` : ''
                }),
                createdAt: row?.NgayNop || '',
                timestamp: toTimestamp(row?.NgayNop),
                badgeCount: 0,
                actionLabel: t('supportCenterPage.feed.actions.viewApplicationDetails'),
                actionTo: '/jobs/applied'
              };
            })
          : [];

        const employerApplicationNotifications = normalizedRole === 'nha tuyen dung'
          ? appRows
            .map((row, index) => {
              const candidateName = String(row?.TenUngVien || 'Ứng viên').trim() || 'Ứng viên';
              const jobTitle = String(row?.TieuDe || 'tin tuyển dụng').trim() || 'tin tuyển dụng';
              const statusText = String(row?.TrangThai || '').trim();
              return {
                id: `employer-app-${row?.MaUngTuyen || row?.MaTin || index}`,
                type: 'application-received',
                typeLabel: buildFeedTypeLabel('application-received', t),
                title: t('supportCenterPage.feed.employerApplication.title', { jobTitle }),
                description: t('supportCenterPage.feed.employerApplication.description', {
                  candidateName,
                  statusText: statusText ? ` (${statusText})` : ''
                }),
                createdAt: row?.NgayNop || '',
                timestamp: toTimestamp(row?.NgayNop),
                badgeCount: 0,
                actionLabel: t('supportCenterPage.feed.actions.viewApplicationDetails'),
                actionTo: '/employer/applications'
              };
            })
          : [];

        const commentRows = Array.isArray(employerReviewResult?.payload?.comments) ? employerReviewResult.payload.comments : [];
        const companyCommentNotifications = normalizedRole === 'nha tuyen dung'
          ? commentRows.map((row, index) => {
            const author = String(row?.userName || 'Ứng viên').trim() || 'Ứng viên';
            return {
              id: `company-comment-${row?.id || index}`,
              type: 'company-comment',
              typeLabel: buildFeedTypeLabel('company-comment', t),
              title: t('supportCenterPage.feed.titles.companyComment'),
              description: t('supportCenterPage.feed.companyComment.description', {
                author,
                content: trimText(row?.content || t('supportCenterPage.feed.companyComment.defaultText'), 160)
              }),
              createdAt: row?.createdAt || '',
              timestamp: toTimestamp(row?.createdAt),
              badgeCount: 0,
              actionLabel: t('supportCenterPage.feed.actions.viewCompanyProfile'),
              actionTo: '/employer/company'
            };
          })
          : [];

        const ratingRows = Array.isArray(employerReviewResult?.payload?.recentRatings) ? employerReviewResult.payload.recentRatings : [];
        const companyRatingNotifications = normalizedRole === 'nha tuyen dung'
          ? ratingRows.map((row, index) => {
            const stars = Number(row?.stars || 0);
            const author = String(row?.userName || 'Ứng viên').trim() || 'Ứng viên';
            return {
              id: `company-rating-${row?.id || index}`,
              type: 'company-rating',
              typeLabel: buildFeedTypeLabel('company-rating', t),
              title: t('supportCenterPage.feed.titles.companyRating', { stars: stars > 0 ? `${stars}/5` : t('supportCenterPage.feed.titles.new') }),
              description: t('supportCenterPage.feed.companyRating.description', { author }),
              createdAt: row?.createdAt || '',
              timestamp: toTimestamp(row?.createdAt),
              badgeCount: 0,
              actionLabel: t('supportCenterPage.feed.actions.viewCompanyProfile'),
              actionTo: '/employer/company'
            };
          })
          : [];

        const merged = [
          ...messageNotifications,
          ...candidateApplicationNotifications,
          ...employerApplicationNotifications,
          ...companyCommentNotifications,
          ...companyRatingNotifications
        ]
          .sort((a, b) => (b.timestamp - a.timestamp));

        setNotificationFeed(merged.slice(0, 80));
      } catch (error) {
        if (!cancelled) {
          setFeedError(error?.message || t('supportCenterPage.feed.errors.loadFailed'));
          setNotificationFeed([]);
        }
      } finally {
        loadingInFlightRef.current = false;
        if (!cancelled) {
          setFeedLoading(false);
        }
      }
    };

    loadNotifications('initial');

    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') {
        loadNotifications('focus');
      }
    };

    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') {
        loadNotifications('visibility');
      }
    };

    if (typeof window !== 'undefined' && !privateFeedDenied) {
      intervalId = window.setInterval(() => loadNotifications('interval'), 30000);
      window.addEventListener('focus', refreshOnFocus);
    }
    if (typeof document !== 'undefined' && !privateFeedDenied) {
      document.addEventListener('visibilitychange', refreshOnVisible);
    }

    return () => {
      cancelled = true;
      if (intervalId && typeof window !== 'undefined') {
        window.clearInterval(intervalId);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', refreshOnFocus);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', refreshOnVisible);
      }
    };
  }, [API_BASE, canReadPrivateNotifications, messageLink, normalizedRole, privateFeedDenied, token]);

  const handleEnableNotifications = async () => {
    const result = await requestBrowserNotificationPermission();
    setPermissionState(result.permission);

    if (result.permission === 'granted') {
      notify({
        type: 'success',
        mode: 'toast',
        title: t('supportCenterPage.notifications.enabledTitle'),
        message: t('supportCenterPage.notifications.enabledMessage')
      });
      return;
    }

    if (result.permission === 'denied') {
      notify({
        type: 'warning',
        mode: 'toast',
        title: t('supportCenterPage.notifications.deniedTitle'),
        message: t('supportCenterPage.notifications.deniedMessage')
      });
    }
  };

  return (
    <div className="support-center-page">
      <section className="support-hero support-hero--single">
        <div className="support-hero-copy">
          <span className="support-eyebrow">{t('supportCenterPage.hero.eyebrow')}</span>
          <h1>{t('supportCenterPage.hero.title')}</h1>
          <p>{t('supportCenterPage.hero.description')}</p>
          <div className="support-hero-actions">
            <button
              type="button"
              className={`btn btn-primary support-primary-btn ${notificationsEnabled ? 'is-enabled' : ''}`}
              onClick={handleEnableNotifications}
              disabled={notificationsEnabled}
            >
              <i className="bi bi-bell me-2"></i>
              {notificationsEnabled ? t('supportCenterPage.buttons.enabledNotifications') : t('supportCenterPage.buttons.enableNotifications')}
            </button>
          </div>
        </div>
      </section>

      <section className="support-content-grid support-content-grid--single">
        <div className="support-panel">
          <div className="support-panel-head">
            <h2>{t('supportCenterPage.panel.title')}</h2>
            <span>{t('supportCenterPage.panel.itemsCount', { count: notificationFeed.length })}</span>
          </div>

          {canReadPrivateNotifications && feedLoading ? <div className="support-state-inline">{t('supportCenterPage.feed.loading')}</div> : null}
          {canReadPrivateNotifications && feedError ? <div className="alert alert-danger mb-0">{feedError}</div> : null}

          {!isLoggedIn ? (
            <div className="support-empty-state">
              <h3>{t('supportCenterPage.empty.loginTitle')}</h3>
              <p>{t('supportCenterPage.empty.loginDescription')}</p>
              <Link to="/login" className="btn btn-primary">{t('supportCenterPage.empty.loginButton')}</Link>
            </div>
          ) : null}

          {isLoggedIn && !canReadPrivateNotifications ? (
            <div className="support-empty-state">
              <h3>{t('supportCenterPage.empty.noPrivateFeedTitle')}</h3>
              <p>{t('supportCenterPage.empty.noPrivateFeedDescription')}</p>
            </div>
          ) : null}

          {isLoggedIn && canReadPrivateNotifications && privateFeedDenied ? (
            <div className="support-empty-state">
              <h3>{t('supportCenterPage.empty.privateAccessDeniedTitle')}</h3>
              <p>{t('supportCenterPage.empty.privateAccessDeniedDescription')}</p>
            </div>
          ) : null}

          {canReadPrivateNotifications && !privateFeedDenied && !feedLoading && !feedError && notificationFeed.length === 0 ? (
            <div className="support-empty-state">
              <h3>{t('supportCenterPage.empty.noNotificationsTitle')}</h3>
              <p>{t('supportCenterPage.empty.noNotificationsDescription')}</p>
            </div>
          ) : null}

          {canReadPrivateNotifications && !privateFeedDenied && !feedLoading && !feedError && notificationFeed.length > 0 ? (
            <div className="support-feed-list">
              {notificationFeed.map((item) => (
                <article key={item.id} className="support-feed-item">
                  <div className="support-feed-meta">
                    <span className={`support-feed-type ${item.type}`}>
                      {item.typeLabel || buildFeedTypeLabel(item.type, t)}
                    </span>
                    <span className="support-feed-time">{formatDateTime(item.createdAt, t)}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="support-feed-actions">
                    {item.badgeCount > 0 ? <span className="support-feed-badge">+{item.badgeCount}</span> : null}
                    <Link to={item.actionTo} className="support-feed-action">{item.actionLabel}</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default SupportCenterPage;
