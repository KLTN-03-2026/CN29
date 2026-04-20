import React from 'react';
import { useTranslation } from 'react-i18next';

const getJobSkillNames = (job) => {
  const source = Array.isArray(job?.skills) ? job.skills : [];
  return source
    .map((item) => {
      if (typeof item === 'string') return String(item).trim();
      return String(item?.name || item?.TenKyNang || '').trim();
    })
    .filter(Boolean)
    .slice(0, 4);
};

const LatestJobsSection = ({
  jobs,
  totalJobs,
  loading,
  error,
  savedSet,
  toolbarOptions,
  activeToolbar,
  onToolbarChange,
  onToggleSave,
  onOpenJob,
  onApplyJob,
  onViewAllJobs,
  formatSalary,
  getPostedLabel,
  getHighlightBadge
}) => {
  const { t, i18n } = useTranslation();
  const currentLocale = String(i18n.resolvedLanguage || i18n.language || 'vi').startsWith('en')
    ? 'en-US'
    : 'vi-VN';
  const hasJobs = Array.isArray(jobs) && jobs.length > 0;
  const normalizedTotalJobs = Number.isFinite(Number(totalJobs))
    ? Number(totalJobs)
    : (hasJobs ? jobs.length : 0);
  const showLoadingState = Boolean(loading && !hasJobs);

  return (
    <section className="home-jobs-section">
      <div className="home-jobs-header">
        <div className="home-jobs-header-left">
          <p className="home-section-eyebrow">{t('home.latest.eyebrow')}</p>
          <h2>{t('home.latest.title')}</h2>
        </div>

        <div className="home-jobs-header-right">
          <p className="home-section-subtitle home-section-subtitle-right">
            {showLoadingState
              ? t('home.latest.syncing')
              : t('home.latest.subtitleWithCount', { count: normalizedTotalJobs.toLocaleString(currentLocale) })}
          </p>

          <button type="button" className="home-view-all-btn" onClick={onViewAllJobs}>
            {t('home.latest.viewAll')}
          </button>
        </div>
      </div>

      <div className="home-jobs-toolbar" role="group" aria-label={t('home.filters.toolbar.aria')}>
        {toolbarOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`home-toolbar-chip ${activeToolbar === option.key ? 'is-active' : ''}`}
            onClick={() => onToolbarChange(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error ? <div className="home-jobs-error">{error}</div> : null}

      {showLoadingState ? (
        <div className="home-jobs-loading">{t('home.latest.loading')}</div>
      ) : !hasJobs ? (
        <div className="home-jobs-empty">{t('home.latest.empty')}</div>
      ) : (
        <div className="home-jobs-feed">
          {jobs.map((job) => {
            const isSaved = savedSet.has(String(job.MaTin));
            const badgeLabel = getHighlightBadge(job);
            const skillNames = getJobSkillNames(job);

            return (
              <article key={job.MaTin} className="home-job-card">
                <div className="home-job-logo-wrap">
                  <img
                    src={job.Logo || '/images/logo.png'}
                    alt={job.TenCongTy || t('home.latest.logoAltFallback')}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = '/images/logo.png';
                    }}
                  />
                </div>

                <div className="home-job-main">
                  <div className="home-job-title-row">
                    <button
                      type="button"
                      className="home-job-title-btn"
                      onClick={() => onOpenJob(job)}
                    >
                      {job.TieuDe || t('home.latest.untitled')}
                    </button>
                  </div>

                  <div className="home-job-company">{job.TenCongTy || t('home.latest.companyFallback')}</div>

                  <div className="home-job-meta">
                    <span><i className="bi bi-cash-coin"></i>{formatSalary(job)}</span>
                    <span><i className="bi bi-geo-alt"></i>{job.ThanhPho || job.DiaDiem || t('home.latest.locationNationwide')}</span>
                    <span><i className="bi bi-briefcase"></i>{job.HinhThuc || t('home.latest.fullTimeFallback')}</span>
                    <span><i className="bi bi-person-workspace"></i>{job.KinhNghiem || t('home.latest.noExperience')}</span>
                  </div>

                  {skillNames.length > 0 ? (
                    <div className="home-job-skills" data-i18n-skip="true">
                      {skillNames.map((skillName) => (
                        <span key={`${job.MaTin}-${skillName}`}>{skillName}</span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="home-job-side">
                  <div className="home-job-status">
                    <span className="home-job-time">{getPostedLabel(job)}</span>
                    {badgeLabel ? <span className="home-job-badge home-job-side-badge">{badgeLabel}</span> : null}
                  </div>

                  <div className="home-job-actions">
                    <button
                      type="button"
                      className={`home-save-btn ${isSaved ? 'is-saved' : ''}`}
                      onClick={() => onToggleSave(job.MaTin)}
                      title={isSaved ? t('home.latest.unsaveJob') : t('home.latest.saveJob')}
                    >
                      <i className={`bi ${isSaved ? 'bi-heart-fill' : 'bi-heart'}`}></i>
                    </button>
                    <button
                      type="button"
                      className="home-apply-btn"
                      onClick={() => onApplyJob(job)}
                    >
                      {t('home.latest.apply')}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default LatestJobsSection;
