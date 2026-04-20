import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../components/NotificationProvider';
import { API_BASE as CLIENT_API_BASE } from '../../config/apiBase';
import './JobTrackerPages.css';

const formatDate = (value, locale) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale).format(d);
};

const formatSalary = (job, locale, t) => {
  const fmtVnd = new Intl.NumberFormat(locale);
  const type = job.KieuLuong || t('candidatePages.common.salary.negotiable');
  const from = job.LuongTu == null ? null : Number(job.LuongTu);
  const to = job.LuongDen == null ? null : Number(job.LuongDen);

  if (type === 'Thỏa thuận' || type === t('candidatePages.common.salary.negotiable') || (from == null && to == null)) {
    return t('candidatePages.common.salary.negotiable');
  }
  const unit = String(type).toLowerCase();

  if (Number.isFinite(from) && Number.isFinite(to)) return t('candidatePages.common.salary.range', { from: fmtVnd.format(from), to: fmtVnd.format(to), unit });
  if (Number.isFinite(from)) return t('candidatePages.common.salary.from', { amount: fmtVnd.format(from), unit });
  if (Number.isFinite(to)) return t('candidatePages.common.salary.to', { amount: fmtVnd.format(to), unit });
  return t('candidatePages.common.salary.negotiable');
};

const SavedJobsPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { notify } = useNotification();
  const API_BASE = CLIENT_API_BASE;
  const locale = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase().startsWith('en') ? 'en-US' : 'vi-VN';

  const token = useMemo(() => localStorage.getItem('token') || '', []);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      if (!token) {
        setLoading(false);
        setItems([]);
        setError(t('candidatePages.savedJobs.errors.loginRequired'));
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/jobs/saved`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data && data.error) || t('candidatePages.savedJobs.errors.loadFailed'));

        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err.message || t('candidatePages.savedJobs.errors.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, t, token]);

  const removeSaved = async (jobId) => {
    if (!token) {
      notify({ type: 'error', message: t('candidatePages.savedJobs.errors.loginRequiredShort') });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/jobs/saved/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && data.error) || t('candidatePages.savedJobs.errors.removeFailed'));

      setItems((prev) => prev.filter((x) => String(x.MaTin) !== String(jobId)));
      notify({ type: 'success', message: t('candidatePages.savedJobs.messages.removed') });
    } catch (err) {
      notify({ type: 'error', message: err.message || t('candidatePages.savedJobs.errors.removeFailed') });
    }
  };

  return (
    <div className="job-tracker-page">
      <div className="container">
        <div className="job-tracker-shell">
          <header className="job-tracker-header theme-saved">
            <div>
              <h1 className="job-tracker-title">{t('candidatePages.savedJobs.title')}</h1>
              <p className="job-tracker-subtitle">{t('candidatePages.savedJobs.subtitle')}</p>
              {!loading && !error ? (
                <div className="job-tracker-count">
                  <i className="bi bi-bookmark-heart"></i>
                  {t('candidatePages.savedJobs.count', { count: items.length.toLocaleString(locale) })}
                </div>
              ) : null}
            </div>
            <button type="button" className="btn job-tracker-back" onClick={() => navigate(-1)}>
              {t('candidatePages.common.back')}
            </button>
          </header>

          {loading ? <div className="job-tracker-state">{t('candidatePages.savedJobs.loading')}</div> : null}
          {error && !loading ? <div className="alert alert-danger mb-0">{error}</div> : null}

          {!loading && !error && items.length === 0 ? (
            <div className="job-tracker-empty">
              <i className="bi bi-bookmark-x"></i>
              <h5>{t('candidatePages.savedJobs.emptyTitle')}</h5>
              <p>{t('candidatePages.savedJobs.emptyDescription')}</p>
              <Link to="/jobs" className="btn btn-success">{t('candidatePages.common.findJobsNow')}</Link>
            </div>
          ) : null}

          {!loading && !error && items.length > 0 ? (
            <section className="job-tracker-list">
              {items.map((j) => {
                const deadline = formatDate(j.HanNopHoSo, locale);
                return (
                  <article key={j.MaTin} className="job-tracker-card">
                    <div className="job-tracker-logo">
                      <img
                        src={j.Logo || '/images/logo.png'}
                        alt={j.TenCongTy || t('candidatePages.common.logoAlt')}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/images/logo.png';
                        }}
                      />
                    </div>

                    <div className="job-tracker-body">
                      <h4 className="job-tracker-job-title">
                        <Link to={`/jobs/${j.MaTin}`}>{j.TieuDe}</Link>
                      </h4>
                      <div className="job-tracker-company">{j.TenCongTy || t('candidatePages.common.employerFallback')}</div>

                      <div className="job-tracker-meta">
                        <span className="job-chip"><i className="bi bi-geo-alt"></i>{j.ThanhPho || '---'}</span>
                        <span className="job-chip"><i className="bi bi-briefcase"></i>{j.HinhThuc || '---'}</span>
                        <span className="job-chip"><i className="bi bi-cash-coin"></i>{formatSalary(j, locale, t)}</span>
                        {deadline ? <span className="job-chip"><i className="bi bi-calendar-event"></i>{t('candidatePages.savedJobs.deadline', { date: deadline })}</span> : null}
                      </div>
                    </div>

                    <div className="job-tracker-actions">
                      <Link to={`/jobs/${j.MaTin}`} className="btn btn-success">{t('candidatePages.savedJobs.viewDetail')}</Link>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => removeSaved(j.MaTin)}
                        aria-label={t('candidatePages.savedJobs.remove')}
                      >
                        <i className="bi bi-bookmark-x me-1"></i>
                        {t('candidatePages.savedJobs.remove')}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SavedJobsPage;

