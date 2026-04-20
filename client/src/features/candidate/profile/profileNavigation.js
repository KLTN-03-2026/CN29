export const PROFILE_TAB_OVERVIEW = 'overview';
export const PROFILE_TAB_JOBS = 'jobs';
export const PROFILE_TAB_INVITATIONS = 'invitations';
export const PROFILE_TAB_NOTIFICATIONS = 'notifications';
export const PROFILE_TAB_SETTINGS = 'settings';

export const PROFILE_ALLOWED_TABS = [
  PROFILE_TAB_OVERVIEW,
  PROFILE_TAB_JOBS,
  PROFILE_TAB_INVITATIONS,
  PROFILE_TAB_NOTIFICATIONS,
  PROFILE_TAB_SETTINGS
];

export const PROFILE_NAV_ITEMS = [
  { key: PROFILE_TAB_OVERVIEW, icon: 'bi-grid', labelKey: 'candidatePages.profile.nav.overview' },
  { key: PROFILE_TAB_JOBS, icon: 'bi-briefcase', labelKey: 'candidatePages.profile.nav.jobs' },
  { key: PROFILE_TAB_INVITATIONS, icon: 'bi-envelope', labelKey: 'candidatePages.profile.nav.invitations', badge: null },
  { key: PROFILE_TAB_NOTIFICATIONS, icon: 'bi-bell', labelKey: 'candidatePages.profile.nav.notifications' },
  { key: PROFILE_TAB_SETTINGS, icon: 'bi-gear', labelKey: 'candidatePages.profile.nav.settings' }
];

export const normalizeProfileTab = (tab, fallback = PROFILE_TAB_OVERVIEW) =>
  PROFILE_ALLOWED_TABS.includes(tab) ? tab : fallback;
