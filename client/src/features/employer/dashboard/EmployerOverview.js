import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE as CLIENT_API_BASE } from '../../../config/apiBase';

const EmployerOverview = () => {
    const { t, i18n } = useTranslation();
    const currentLocale = i18n.resolvedLanguage || i18n.language || 'vi';

    const [stats, setStats] = useState({
        jobs: 0,
        applications: 0,
        views: 0,
        savedCandidates: 0
    });
    const [activities, setActivities] = useState([]);
    const [reportLoading, setReportLoading] = useState(true);
    const [reportError, setReportError] = useState('');
    const [reportJobs, setReportJobs] = useState([]);

    useEffect(() => {
        fetchStats();
        fetchReportData();
        fetchActivities();
    }, []);

    const fetchStats = async () => {
        const API_BASE = CLIENT_API_BASE;
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/employer/overview`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || t('employer.overview.errors.loadStats'));

            const s = data?.stats || {};
            setStats({
                jobs: Number(s.jobs || 0),
                applications: Number(s.applications || 0),
                views: Number(s.views || 0),
                savedCandidates: Number(s.savedCandidates || 0)
            });
        } catch {
            // keep current stats
        }
    };

    const fetchReportData = async () => {
        const API_BASE = CLIENT_API_BASE;
        const token = localStorage.getItem('token');
        if (!token) {
            setReportLoading(false);
            setReportJobs([]);
            return;
        }

        setReportLoading(true);
        setReportError('');
        try {
            const res = await fetch(`${API_BASE}/api/employer/statistics`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || t('employer.overview.errors.loadReports'));

            const summary = data?.summary || {};
            setStats((prev) => ({
                jobs: Number(summary.jobs || prev.jobs || 0),
                applications: Number(summary.applications || prev.applications || 0),
                views: Number(summary.views || prev.views || 0),
                savedCandidates: Number(summary.savedCandidates || prev.savedCandidates || 0)
            }));
            setReportJobs(Array.isArray(data?.jobs) ? data.jobs : []);
        } catch (error) {
            setReportError(error?.message || t('employer.overview.errors.genericReport'));
            setReportJobs([]);
        } finally {
            setReportLoading(false);
        }
    };

    const fetchActivities = async () => {
        // Mock data
        setActivities([]);
    };

    const maxViews = useMemo(() => {
        if (!Array.isArray(reportJobs) || reportJobs.length === 0) return 0;
        return reportJobs.reduce((maxValue, job) => Math.max(maxValue, Number(job?.views || 0)), 0);
    }, [reportJobs]);

    const handleScrollToReports = () => {
        const reportSection = document.getElementById('employer-dashboard-reports');
        if (!reportSection) return;
        reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const formatCount = (value) => new Intl.NumberFormat(currentLocale).format(Number(value || 0));

    const translateJobStatus = (status) => {
        const raw = String(status || '').trim();
        if (!raw) return '';

        const normalized = raw.toLowerCase();
        if (normalized === 'đã đăng' || normalized === 'published') return t('employer.overview.status.published');
        if (normalized === 'nháp' || normalized === 'draft') return t('employer.overview.status.draft');
        if (normalized === 'đã đóng' || normalized === 'closed') return t('employer.overview.status.closed');

        return raw;
    };

    return (
        <div className="employer-overview-page">
            <div className="d-flex justify-content-between align-items-center mb-4 employer-overview-hero">
                <div>
                    <h2 className="mb-1 employer-page-title">{t('employer.overview.title')}</h2>
                    <p className="text-muted mb-0">{t('employer.overview.subtitle')}</p>
                </div>
                <Link to="/employer/jobs/create" className="btn btn-primary">
                    <i className="bi bi-plus-circle me-2"></i>
                    {t('employer.overview.actions.createJob')}
                </Link>
            </div>
            
            {/* Statistics Cards */}
            <div className="row g-4 mb-4">
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100 employer-overview-stat-card employer-overview-stat-card--jobs">
                        <div className="card-body text-center">
                            <div className="text-primary mb-3">
                                <i className="bi bi-briefcase fs-1"></i>
                            </div>
                            <h3 className="mb-1">{formatCount(stats.jobs)}</h3>
                            <p className="text-muted mb-2">{t('employer.overview.stats.jobs')}</p>
                            <Link to="/employer/jobs" className="btn btn-sm btn-outline-primary">
                                {t('employer.overview.actions.manage')}
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100 employer-overview-stat-card employer-overview-stat-card--applications">
                        <div className="card-body text-center">
                            <div className="text-success mb-3">
                                <i className="bi bi-file-earmark-text fs-1"></i>
                            </div>
                            <h3 className="mb-1">{formatCount(stats.applications)}</h3>
                            <p className="text-muted mb-2">{t('employer.overview.stats.applications')}</p>
                            <Link to="/employer/applications" className="btn btn-sm btn-outline-success">
                                {t('employer.overview.actions.viewApplications')}
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100 employer-overview-stat-card employer-overview-stat-card--views">
                        <div className="card-body text-center">
                            <div className="text-info mb-3">
                                <i className="bi bi-eye fs-1"></i>
                            </div>
                            <h3 className="mb-1">{formatCount(stats.views)}</h3>
                            <p className="text-muted mb-2">{t('employer.overview.stats.views')}</p>
                            <button type="button" className="btn btn-sm btn-outline-info" onClick={handleScrollToReports}>
                                {t('employer.overview.actions.viewReports')}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100 employer-overview-stat-card employer-overview-stat-card--saved">
                        <div className="card-body text-center">
                            <div className="text-warning mb-3">
                                <i className="bi bi-people fs-1"></i>
                            </div>
                            <h3 className="mb-1">{formatCount(stats.savedCandidates)}</h3>
                            <p className="text-muted mb-2">{t('employer.overview.stats.savedCv')}</p>
                            <Link to="/employer/cv-manage" className="btn btn-sm btn-outline-warning">
                                {t('employer.overview.actions.manageCv')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reports (merged from Statistics page) */}
            <div id="employer-dashboard-reports" className="row g-4 mb-4">
                <div className="col-12">
                    <div className="card border-0 shadow-sm employer-overview-report-card">
                        <div className="card-header bg-white border-0 py-3 d-flex align-items-center justify-content-between">
                            <h5 className="mb-0">
                                <i className="bi bi-graph-up-arrow me-2"></i>
                                {t('employer.overview.reports.title')}
                            </h5>
                            <small className="text-muted">{t('employer.overview.reports.subtitle')}</small>
                        </div>
                        <div className="card-body">
                            {reportLoading && (
                                <p className="text-muted text-center py-5 mb-0">{t('employer.overview.reports.loading')}</p>
                            )}
                            {!reportLoading && reportError && (
                                <p className="text-danger text-center py-4 mb-0">{reportError}</p>
                            )}
                            {!reportLoading && !reportError && reportJobs.length === 0 && (
                                <p className="text-muted text-center py-5 mb-0">{t('employer.overview.reports.empty')}</p>
                            )}
                            {!reportLoading && !reportError && reportJobs.length > 0 && (
                                <div className="table-responsive">
                                    <table className="table align-middle mb-0">
                                        <thead>
                                            <tr>
                                                <th>{t('employer.overview.reports.columns.job')}</th>
                                                <th style={{ width: 140 }} className="text-end">{t('employer.overview.reports.columns.views')}</th>
                                                <th style={{ width: 170 }}>{t('employer.overview.reports.columns.chart')}</th>
                                                <th style={{ width: 160 }} className="text-end">{t('employer.overview.reports.columns.applications')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportJobs.map((job) => {
                                                const views = Number(job?.views || 0);
                                                const applications = Number(job?.applications || 0);
                                                const ratio = maxViews > 0 ? Math.round((views / maxViews) * 100) : 0;

                                                return (
                                                    <tr key={job?.id || `${job?.title || 'job'}-${views}-${applications}`}>
                                                        <td>
                                                            <div className="fw-semibold">{job?.title || t('employer.overview.reports.fallbackJobTitle')}</div>
                                                            <div className="text-muted small">{translateJobStatus(job?.status)}</div>
                                                        </td>
                                                        <td className="text-end">{formatCount(views)}</td>
                                                        <td>
                                                            <div className="progress" style={{ height: 10 }}>
                                                                <div
                                                                    className="progress-bar bg-info"
                                                                    role="progressbar"
                                                                    style={{ width: `${ratio}%` }}
                                                                    aria-valuenow={ratio}
                                                                    aria-valuemin="0"
                                                                    aria-valuemax="100"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="text-end">{formatCount(applications)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity & Notifications */}
            <div className="row g-4">
                <div className="col-md-8">
                    <div className="card border-0 shadow-sm employer-overview-activity-card">
                        <div className="card-header bg-white border-0 py-3">
                            <h5 className="mb-0">
                                <i className="bi bi-clock-history me-2"></i>
                                {t('employer.overview.activity.title')}
                            </h5>
                        </div>
                        <div className="card-body">
                            {activities.length === 0 ? (
                                <div className="text-center py-5">
                                    <i className="bi bi-inbox fs-1 text-muted"></i>
                                    <p className="text-muted mt-3">{t('employer.overview.activity.empty')}</p>
                                </div>
                            ) : (
                                <div className="list-group list-group-flush">
                                    {activities.map((activity, index) => (
                                        <div key={index} className="list-group-item">
                                            {activity.description}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm employer-overview-notification-card">
                        <div className="card-header bg-white border-0 py-3">
                            <h5 className="mb-0">
                                <i className="bi bi-bell me-2"></i>
                                {t('employer.overview.notifications.title')}
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="text-center py-4">
                                <i className="bi bi-bell-slash fs-1 text-muted"></i>
                                <p className="text-muted mt-3 mb-0">{t('employer.overview.notifications.empty')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployerOverview;
