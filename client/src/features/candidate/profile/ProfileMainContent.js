import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import InstallAppPanel from '../../../components/pwa/InstallAppPanel';
import {
  PROFILE_TAB_INVITATIONS,
  PROFILE_TAB_JOBS,
  PROFILE_TAB_NOTIFICATIONS,
  PROFILE_TAB_OVERVIEW,
  PROFILE_TAB_SETTINGS
} from './profileNavigation';

const avatarFallback = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

const formatDate = (value, locale) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale).format(date);
};

const ProfileMainContent = ({
  activeTab,
  user,
  profileSummary,
  interviewInvitations = [],
  invitationsLoading = false,
  invitationsError = '',
  jobsAppliedCount = 0,
  invitationCount = 0,
  onOpenProfileModal,
  onOpenPasswordModal,
  passwordStatus
}) => {
  const { t, i18n } = useTranslation();
  const locale = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase().startsWith('en') ? 'en-US' : 'vi-VN';
  const currentEmail = user?.email || user?.Email || '';
  const displayName = user?.name || user?.HoTen || user?.fullName || t('candidatePages.profile.sidebar.defaultUser');
  const displayAvatar = user?.avatar || user?.avatarAbsoluteUrl || user?.avatarUrl || user?.AnhDaiDien || avatarFallback;

  return (
    <div className="col-lg-9 col-md-8">
      {activeTab === PROFILE_TAB_OVERVIEW && (
        <>
          <section className="profile-tab-card profile-overview-card mb-3">
            <div className="profile-overview-head">
              <img
                src={displayAvatar}
                alt={t('candidatePages.profile.overview.avatarAlt')}
                className="profile-overview-avatar"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = avatarFallback;
                }}
              />
              <div className="profile-overview-info">
                <p className="profile-overview-eyebrow">{t('candidatePages.profile.overview.eyebrow')}</p>
                <h3>{displayName}</h3>
                <div className="profile-overview-meta">
                  <span><i className="bi bi-briefcase"></i>{profileSummary.position || t('candidatePages.profile.overview.fallbackPosition')}</span>
                  <span><i className="bi bi-geo-alt"></i>{profileSummary.city || t('candidatePages.profile.overview.fallbackCity')}</span>
                  <span><i className="bi bi-envelope"></i>{currentEmail || t('candidatePages.profile.overview.fallbackEmail')}</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenProfileModal}
                  className="btn profile-primary-btn mt-3"
                >
                  <i className="bi bi-pencil-square me-2"></i>
                  {t('candidatePages.profile.overview.updateProfile')}
                </button>
              </div>
            </div>
            <div className="profile-overview-kpis">
              <div className="profile-kpi-item">
                <span>{t('candidatePages.profile.overview.kpis.appliedJobs')}</span>
                <strong>{Number(jobsAppliedCount || 0).toLocaleString(locale)}</strong>
              </div>
              <div className="profile-kpi-item">
                <span>{t('candidatePages.profile.overview.kpis.newInvitations')}</span>
                <strong>{Number(invitationCount || 0).toLocaleString(locale)}</strong>
              </div>
              <div className="profile-kpi-item">
                <span>{t('candidatePages.profile.overview.kpis.notifications')}</span>
                <strong>0</strong>
              </div>
            </div>
          </section>

          <section className="profile-tab-card profile-overview-actions">
            <h5>{t('candidatePages.profile.overview.journey.title')}</h5>
            <p>{t('candidatePages.profile.overview.journey.description')}</p>
            <div className="profile-action-grid">
              <Link to="/jobs" className="profile-action-link">
                <i className="bi bi-search"></i>
                <span>{t('candidatePages.profile.overview.journey.findJobs')}</span>
              </Link>
              <Link to="/jobs/saved" className="profile-action-link">
                <i className="bi bi-bookmark"></i>
                <span>{t('candidatePages.profile.overview.journey.savedJobs')}</span>
              </Link>
              <Link to="/jobs/applied" className="profile-action-link">
                <i className="bi bi-file-earmark-check"></i>
                <span>{t('candidatePages.profile.overview.journey.trackApplications')}</span>
              </Link>
              <button type="button" className="profile-action-link" onClick={onOpenProfileModal}>
                <i className="bi bi-person-vcard"></i>
                <span>{t('candidatePages.profile.overview.journey.completeProfile')}</span>
              </button>
            </div>
          </section>
        </>
      )}

      {activeTab === PROFILE_TAB_JOBS && (
        <section className="profile-tab-card profile-section-card">
          <div className="profile-section-head">
            <h5>{t('candidatePages.profile.jobs.title')}</h5>
            <p>{t('candidatePages.profile.jobs.subtitle')}</p>
          </div>
          <div className="profile-empty-state">
            <div className="profile-empty-icon"><i className="bi bi-briefcase"></i></div>
            <h6>{t('candidatePages.profile.jobs.emptyTitle')}</h6>
            <p>{t('candidatePages.profile.jobs.emptyDescription')}</p>
            <Link to="/jobs" className="btn profile-primary-btn">
              {t('candidatePages.profile.jobs.findJobs')}
            </Link>
          </div>
        </section>
      )}

      {activeTab === PROFILE_TAB_INVITATIONS && (
        <section className="profile-tab-card profile-section-card">
          <div className="profile-section-head">
            <h5>{t('candidatePages.profile.invitations.title')}</h5>
            <p>{t('candidatePages.profile.invitations.subtitle')}</p>
          </div>

          {invitationsLoading ? <div className="profile-inline-state">{t('candidatePages.profile.invitations.loading')}</div> : null}

          {!invitationsLoading && invitationsError ? <div className="alert alert-danger mt-3 mb-0">{invitationsError}</div> : null}

          {!invitationsLoading && !invitationsError && interviewInvitations.length === 0 ? (
            <div className="profile-empty-state">
              <div className="profile-empty-icon"><i className="bi bi-envelope-paper"></i></div>
              <h6>{t('candidatePages.profile.invitations.emptyTitle')}</h6>
              <p>{t('candidatePages.profile.invitations.emptyDescription')}</p>
              <button type="button" className="btn profile-outline-btn" onClick={onOpenProfileModal}>
                {t('candidatePages.profile.invitations.updateProfileNow')}
              </button>
            </div>
          ) : null}

          {!invitationsLoading && !invitationsError && interviewInvitations.length > 0 ? (
            <div className="profile-invitation-list">
              {interviewInvitations.map((item) => {
                const submittedAt = formatDate(item?.NgayNop || item?.submittedAt, locale);
                return (
                  <article key={item?.MaUngTuyen || `${item?.MaTin || 'job'}-${item?.TenCongTy || 'company'}`} className="profile-invitation-item">
                    <div className="profile-invitation-logo">
                      <img
                        src={item?.Logo || '/images/logo.png'}
                        alt={item?.TenCongTy || t('candidatePages.profile.invitations.companyLogoAlt')}
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = '/images/logo.png';
                        }}
                      />
                    </div>
                    <div className="profile-invitation-body">
                      <h6>{item?.TieuDe || t('candidatePages.profile.invitations.positionFallback')}</h6>
                      <p>
                        {item?.TenCongTy || t('candidatePages.common.employerFallback')}
                        {item?.ThanhPho ? ` • ${item.ThanhPho}` : ''}
                      </p>
                      <div className="profile-invitation-meta">
                        <span><i className="bi bi-person-badge"></i>{item?.TrangThai || t('candidatePages.profile.invitations.statusInterview')}</span>
                        {submittedAt ? <span><i className="bi bi-calendar-check"></i>{t('candidatePages.profile.invitations.submittedOn', { date: submittedAt })}</span> : null}
                      </div>
                    </div>
                    <Link to={`/jobs/${item?.MaTin}`} className="btn profile-outline-btn profile-invitation-action">
                      {t('candidatePages.profile.invitations.viewJob')}
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      )}

      {activeTab === PROFILE_TAB_NOTIFICATIONS && (
        <section className="profile-tab-card profile-section-card">
          <div className="profile-section-head">
            <h5>{t('candidatePages.profile.notifications.title')}</h5>
            <p>{t('candidatePages.profile.notifications.subtitle')}</p>
          </div>
          <div className="profile-empty-state">
            <div className="profile-empty-icon"><i className="bi bi-bell"></i></div>
            <h6>{t('candidatePages.profile.notifications.emptyTitle')}</h6>
            <p>{t('candidatePages.profile.notifications.emptyDescription')}</p>
          </div>
        </section>
      )}

      {activeTab === PROFILE_TAB_SETTINGS && (
        <section className="profile-tab-card profile-section-card profile-settings-card">
          <div className="profile-settings-hero mb-4">
            <span className="profile-settings-hero-icon" aria-hidden="true">
              <i className="bi bi-sliders2"></i>
            </span>
            <div>
              <h5>{t('candidatePages.profile.settings.heroTitle')}</h5>
              <p>{t('candidatePages.profile.settings.heroDescription')}</p>
            </div>
          </div>

          <div className="profile-settings-grid">
            <article className="profile-settings-panel profile-settings-panel--security">
              <div className="profile-settings-panel-head">
                <div>
                  <p className="profile-settings-panel-kicker">{t('candidatePages.profile.settings.security.kicker')}</p>
                  <h6>{t('candidatePages.profile.settings.security.title')}</h6>
                </div>
                <button
                  type="button"
                  className="btn btn-sm profile-outline-btn"
                  onClick={onOpenPasswordModal}
                >
                  <i className="bi bi-key me-1"></i>
                  {t('candidatePages.profile.settings.security.button')}
                </button>
              </div>
              <p className="text-muted small mb-0">
                {t('candidatePages.profile.settings.security.hint')}
              </p>
              {passwordStatus.message && (
                <div className={`alert alert-${passwordStatus.type === 'success' ? 'success' : 'danger'} mt-3 mb-0`} role="alert">
                  {passwordStatus.message}
                </div>
              )}
            </article>

            <article className="profile-settings-panel profile-settings-panel--profile">
              <div className="profile-settings-panel-head">
                <div>
                  <p className="profile-settings-panel-kicker">{t('candidatePages.profile.settings.profile.kicker')}</p>
                  <h6>{t('candidatePages.profile.settings.profile.title')}</h6>
                </div>
                <button type="button" className="btn profile-outline-btn" onClick={onOpenProfileModal}>
                  <i className="bi bi-person-vcard me-1"></i>
                  {t('candidatePages.profile.settings.profile.button')}
                </button>
              </div>
              <p className="text-muted small mb-0">
                {t('candidatePages.profile.settings.profile.hint')}
              </p>
            </article>
          </div>

          <article className="profile-settings-panel profile-settings-panel--install mt-4">
            <div className="profile-settings-panel-head mb-3">
              <div>
                <p className="profile-settings-panel-kicker">{t('candidatePages.profile.settings.app.kicker')}</p>
                <h6>{t('candidatePages.profile.settings.app.title')}</h6>
              </div>
            </div>
            <InstallAppPanel />
          </article>
        </section>
      )}
    </div>
  );
};

export default ProfileMainContent;
