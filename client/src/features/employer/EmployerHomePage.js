import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BriefcaseBusiness,
  ChartLine,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Mail,
  PlusCircle,
  Search,
  Sparkles,
  TrendingUp,
  UserRound,
  Users
} from 'lucide-react';
import { API_BASE } from '../../config/apiBase';
import './EmployerHomePage.css';

const readUserSnapshot = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}') || {};
  } catch {
    return {};
  }
};

const readToken = () => String(localStorage.getItem('token') || '').trim();

const EmployerHomePage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase().startsWith('en') ? 'en-US' : 'vi-VN';
  const formatNumber = (value) => new Intl.NumberFormat(locale).format(Number(value) || 0);
  const user = useMemo(() => readUserSnapshot(), []);
  const displayName = String(user?.HoTen || user?.hoTen || user?.name || t('employer.homePage.fallbackName')).trim();

  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplications: 0,
    pendingApplications: 0,
    unreadMessages: 0
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const token = readToken();
    if (!token) {
      setLoadingStats(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const fetchJson = (path) => fetch(`${API_BASE}${path}`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);

    let cancelled = false;

    Promise.all([
      fetchJson('/api/employer/jobs?limit=5'),
      fetchJson('/api/employer/dashboard/stats'),
      fetchJson('/api/messages/unread-count')
    ]).then(([jobsData, statsData, unreadData]) => {
      if (cancelled) return;

      const jobs = Array.isArray(jobsData?.jobs) ? jobsData.jobs
        : Array.isArray(jobsData?.data) ? jobsData.data
        : Array.isArray(jobsData) ? jobsData : [];

      setRecentJobs(jobs.slice(0, 5));

      setStats({
        activeJobs: Number(statsData?.activeJobs ?? statsData?.stats?.activeJobs ?? jobs.length) || 0,
        totalApplications: Number(statsData?.totalApplications ?? statsData?.stats?.totalApplications ?? 0) || 0,
        pendingApplications: Number(statsData?.pendingApplications ?? statsData?.stats?.pendingApplications ?? 0) || 0,
        unreadMessages: Number(unreadData?.unread ?? unreadData?.count ?? 0) || 0
      });
      setLoadingStats(false);
    });

    return () => { cancelled = true; };
  }, []);

  const quickActions = [
    {
      key: 'post-job',
      icon: PlusCircle,
      title: t('employer.homePage.actions.postJob.title'),
      desc: t('employer.homePage.actions.postJob.desc'),
      cta: t('employer.homePage.actions.postJob.cta'),
      to: '/employer/jobs/create',
      tone: 'primary'
    },
    {
      key: 'search-cv',
      icon: Search,
      title: t('employer.homePage.actions.searchCv.title'),
      desc: t('employer.homePage.actions.searchCv.desc'),
      cta: t('employer.homePage.actions.searchCv.cta'),
      to: '/employer/cv-search',
      tone: 'mint'
    },
    {
      key: 'manage-cv',
      icon: Users,
      title: t('employer.homePage.actions.manageCv.title'),
      desc: t('employer.homePage.actions.manageCv.desc'),
      cta: t('employer.homePage.actions.manageCv.cta'),
      to: '/employer/cv-manage',
      tone: 'amber'
    },
    {
      key: 'messages',
      icon: Mail,
      title: t('employer.homePage.actions.messages.title'),
      desc: t('employer.homePage.actions.messages.desc'),
      cta: t('employer.homePage.actions.messages.cta'),
      to: '/employer/messages',
      tone: 'violet'
    }
  ];

  const tips = [
    {
      icon: TrendingUp,
      title: t('employer.homePage.tips.items.trafficTitle'),
      body: t('employer.homePage.tips.items.trafficBody')
    },
    {
      icon: Sparkles,
      title: t('employer.homePage.tips.items.aiTitle'),
      body: t('employer.homePage.tips.items.aiBody')
    },
    {
      icon: ChartLine,
      title: t('employer.homePage.tips.items.metricTitle'),
      body: t('employer.homePage.tips.items.metricBody')
    }
  ];

  return (
    <div className="emp-home">
      <section className="emp-home-hero">
        <div className="emp-home-hero-inner">
          <div className="emp-home-hero-copy">
            <p className="emp-home-eyebrow">{t('employer.homePage.hero.eyebrow')}</p>
            <h1>
              {t('employer.homePage.hero.greeting')} <span className="emp-home-name">{displayName}</span>
            </h1>
            <p className="emp-home-subtitle">
              {t('employer.homePage.hero.subtitle')}
            </p>

            <div className="emp-home-hero-actions">
              <Link to="/employer/jobs/create" className="emp-home-btn emp-home-btn-primary">
                <PlusCircle size={18} />
                <span>{t('employer.homePage.hero.ctaPostJob')}</span>
              </Link>
              <Link to="/employer" className="emp-home-btn emp-home-btn-ghost">
                <LayoutDashboard size={18} />
                <span>{t('employer.homePage.hero.ctaDashboard')}</span>
              </Link>
            </div>
          </div>

          <aside className="emp-home-hero-side">
            <p className="emp-home-side-label">{t('employer.homePage.hero.summaryLabel')}</p>
            <div className="emp-home-side-row">
              <div className="emp-home-side-icon"><BriefcaseBusiness size={18} /></div>
              <div>
                <strong>{loadingStats ? '…' : formatNumber(stats.activeJobs)}</strong>
                <span>{t('employer.homePage.hero.stats.activeJobs')}</span>
              </div>
            </div>
            <div className="emp-home-side-row">
              <div className="emp-home-side-icon emp-mint"><FileText size={18} /></div>
              <div>
                <strong>{loadingStats ? '…' : formatNumber(stats.totalApplications)}</strong>
                <span>{t('employer.homePage.hero.stats.applications')}</span>
              </div>
            </div>
            <div className="emp-home-side-row">
              <div className="emp-home-side-icon emp-amber"><UserRound size={18} /></div>
              <div>
                <strong>{loadingStats ? '…' : formatNumber(stats.pendingApplications)}</strong>
                <span>{t('employer.homePage.hero.stats.pending')}</span>
              </div>
            </div>
            <div className="emp-home-side-row">
              <div className="emp-home-side-icon emp-violet"><Mail size={18} /></div>
              <div>
                <strong>{loadingStats ? '…' : formatNumber(stats.unreadMessages)}</strong>
                <span>{t('employer.homePage.hero.stats.unreadMessages')}</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="emp-home-section">
        <div className="emp-home-section-head">
          <h2>{t('employer.homePage.quickStart.title')}</h2>
          <p>{t('employer.homePage.quickStart.subtitle')}</p>
        </div>

        <div className="emp-home-actions-grid">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                type="button"
                className={`emp-home-action-card emp-home-action-${action.tone}`}
                onClick={() => navigate(action.to)}
              >
                <div className="emp-home-action-icon"><Icon size={24} /></div>
                <h3>{action.title}</h3>
                <p>{action.desc}</p>
                <span className="emp-home-action-cta">
                  {action.cta}
                  <ChevronRight size={16} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="emp-home-section emp-home-grid-2">
        <div className="emp-home-card">
          <div className="emp-home-card-head">
            <h2>{t('employer.homePage.recentJobs.title')}</h2>
            <Link to="/employer/jobs" className="emp-home-link">
              {t('employer.homePage.recentJobs.viewAll')} <ChevronRight size={14} />
            </Link>
          </div>

          {loadingStats ? (
            <div className="emp-home-empty">{t('employer.homePage.recentJobs.loading')}</div>
          ) : recentJobs.length === 0 ? (
            <div className="emp-home-empty">
              <p>{t('employer.homePage.recentJobs.empty')}</p>
              <Link to="/employer/jobs/create" className="emp-home-btn emp-home-btn-primary emp-home-btn-sm">
                <PlusCircle size={16} />
                <span>{t('employer.homePage.recentJobs.emptyCta')}</span>
              </Link>
            </div>
          ) : (
            <ul className="emp-home-job-list">
              {recentJobs.map((job, idx) => {
                const id = job?.MaTin || job?.id || idx;
                const title = String(job?.TieuDe || job?.title || '—');
                const status = String(job?.TrangThai || job?.status || '');
                return (
                  <li key={id} className="emp-home-job-item">
                    <Link to={`/employer/jobs/${id}`} className="emp-home-job-link">
                      <span className="emp-home-job-title">{title}</span>
                      {status ? <span className="emp-home-job-status">{status}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="emp-home-card emp-home-tips">
          <div className="emp-home-card-head">
            <h2>{t('employer.homePage.tips.title')}</h2>
          </div>
          <ul className="emp-home-tips-list">
            {tips.map((tip) => {
              const Icon = tip.icon;
              return (
                <li key={tip.title}>
                  <div className="emp-home-tip-icon"><Icon size={18} /></div>
                  <div>
                    <strong>{tip.title}</strong>
                    <p>{tip.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default EmployerHomePage;
