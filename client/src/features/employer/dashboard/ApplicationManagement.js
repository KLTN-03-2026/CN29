import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE as CLIENT_API_BASE } from '../../../config/apiBase';
import SmartPagination from '../../../components/SmartPagination';

const PAGE_SIZE = 10;

const STATUS_CLASS_BY_VALUE = {
    'Đã nộp': 'viewed',
    'Đang xem xét': 'contacted',
    'Phỏng vấn': 'suitable',
    'Đề nghị': 'suitable',
    'Từ chối': 'rejected',
    'Đã nhận': 'suitable'
};

const STATUS_LABEL_KEYS = {
    'Đã nộp': 'submitted',
    'Đang xem xét': 'reviewing',
    'Phỏng vấn': 'interview',
    'Đề nghị': 'offer',
    'Từ chối': 'rejected',
    'Đã nhận': 'accepted'
};

const createApplicationFilters = (t) => ([
    { key: 'all', label: t('employer.applicationManagement.filters.all'), icon: 'bi-collection' },
    { key: 'new', label: t('employer.applicationManagement.filters.new'), icon: 'bi-envelope-paper' },
    { key: 'viewed', label: t('employer.applicationManagement.filters.viewed'), icon: 'bi-eye' },
    { key: 'interview', label: t('employer.applicationManagement.filters.interview'), icon: 'bi-calendar2-check' },
    { key: 'rejected', label: t('employer.applicationManagement.filters.rejected'), icon: 'bi-x-circle' }
]);

const getStatusValue = (app) => String(app?.TrangThai || 'Đã nộp').trim();

const getStatusLabel = (statusValue, t) => {
    const normalizedKey = STATUS_LABEL_KEYS[statusValue] || 'default';
    return t(`employer.applicationManagement.status.${normalizedKey}`, { status: statusValue });
};

const formatDate = (value, locale, fallback) => {
    if (!value) return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
    const normalizedLocale = String(locale || '').toLowerCase().startsWith('en') ? 'en-US' : 'vi-VN';
    return new Intl.DateTimeFormat(normalizedLocale, { dateStyle: 'short' }).format(parsed);
};

const ApplicationManagement = () => {
    const API_BASE = CLIENT_API_BASE;
    const { t, i18n } = useTranslation();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const [selectedApp, setSelectedApp] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const locale = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase();
    const applicationFilters = useMemo(() => createApplicationFilters(t), [t]);

    const loadApplications = useCallback(async () => {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        if (!token) {
            setError(t('employer.applicationManagement.errors.notLoggedIn'));
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/applications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || t('employer.applicationManagement.errors.loadFailed'));

            setApplications(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err?.message || t('employer.applicationManagement.errors.generic'));
        } finally {
            setLoading(false);
        }
    }, [API_BASE, t]);

    useEffect(() => {
        loadApplications();
    }, [loadApplications]);

    const counts = useMemo(() => {
        const all = applications.length;
        const newCount = applications.filter((app) => getStatusValue(app) === 'Đã nộp').length;
        const viewed = applications.filter((app) => getStatusValue(app) !== 'Đã nộp').length;
        const interview = applications.filter((app) => ['Phỏng vấn', 'Đề nghị'].includes(getStatusValue(app))).length;
        const rejected = applications.filter((app) => getStatusValue(app) === 'Từ chối').length;

        return {
            all,
            new: newCount,
            viewed,
            interview,
            rejected
        };
    }, [applications]);

    const filteredApps = useMemo(() => {
        if (filter === 'all') return applications;
        if (filter === 'new') return applications.filter((app) => getStatusValue(app) === 'Đã nộp');
        if (filter === 'viewed') return applications.filter((app) => getStatusValue(app) !== 'Đã nộp');
        if (filter === 'interview') return applications.filter((app) => ['Phỏng vấn', 'Đề nghị'].includes(getStatusValue(app)));
        if (filter === 'rejected') return applications.filter((app) => getStatusValue(app) === 'Từ chối');
        return applications;
    }, [applications, filter]);

    const totalFilteredApps = filteredApps.length;
    const totalPages = Math.max(1, Math.ceil(totalFilteredApps / PAGE_SIZE));
    const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);

    const pagedFilteredApps = useMemo(() => {
        const offset = (safeCurrentPage - 1) * PAGE_SIZE;
        return filteredApps.slice(offset, offset + PAGE_SIZE);
    }, [filteredApps, safeCurrentPage]);

    const rangeFrom = totalFilteredApps === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
    const rangeTo = totalFilteredApps === 0 ? 0 : Math.min(safeCurrentPage * PAGE_SIZE, totalFilteredApps);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    useEffect(() => {
        if (currentPage !== safeCurrentPage) {
            setCurrentPage(safeCurrentPage);
        }
    }, [currentPage, safeCurrentPage]);

    const openDetails = (app) => {
        setSelectedApp(app);
    };

    const updateApplicationStatus = async (appId, newStatus) => {
        setUpdating(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/applications/${appId}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || t('employer.applicationManagement.errors.updateFailed'));

            setApplications((prev) =>
                prev.map((app) =>
                    app.MaUngTuyen === appId ? { ...app, TrangThai: newStatus } : app
                )
            );
            setSelectedApp((prev) => (prev?.MaUngTuyen === appId ? { ...prev, TrangThai: newStatus } : prev));
            alert(t('employer.applicationManagement.notifications.statusUpdated', {
                status: getStatusLabel(newStatus, t)
            }));
        } catch (err) {
            alert(err?.message || t('employer.applicationManagement.errors.generic'));
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div>
            <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-4">
                <div>
                    <h2 className="mb-1 employer-page-title">{t('employer.applicationManagement.pageTitle')}</h2>
                </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                    <div className="cv-manage-filter-wrap" role="tablist" aria-label={t('employer.applicationManagement.filters.aria')}>
                        {applicationFilters.map((item) => {
                            const active = filter === item.key;
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    className={`cv-manage-filter-btn ${active ? 'active' : ''}`}
                                    onClick={() => setFilter(item.key)}
                                >
                                    <span className="cv-manage-filter-icon"><i className={`bi ${item.icon}`}></i></span>
                                    <span className="cv-manage-filter-label">{item.label}</span>
                                    <span className="cv-manage-filter-count">{counts[item.key] || 0}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-body">
                    {loading && <p className="text-center py-5 mb-0">{t('employer.applicationManagement.loading')}</p>}

                    {!loading && filteredApps.length === 0 && (
                        <div className="text-muted text-center py-5">
                            <i className="bi bi-inbox fs-2 d-block mb-2"></i>
                            {filter === 'all' ? t('employer.applicationManagement.empty.all') : t('employer.applicationManagement.empty.filtered')}
                        </div>
                    )}

                    {!loading && filteredApps.length > 0 && (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>{t('employer.applicationManagement.table.candidate')}</th>
                                        <th>{t('employer.applicationManagement.table.email')}</th>
                                        <th>{t('employer.applicationManagement.table.position')}</th>
                                        <th>{t('employer.applicationManagement.table.submittedAt')}</th>
                                        <th>{t('employer.applicationManagement.table.status')}</th>
                                        <th className="text-end">{t('employer.applicationManagement.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedFilteredApps.map((app) => {
                                        const statusValue = getStatusValue(app);
                                        const statusLabel = getStatusLabel(statusValue, t);
                                        return (
                                            <tr key={app.MaUngTuyen}>
                                                <td className="fw-semibold">{app.TenUngVien || t('common.notAvailable')}</td>
                                                <td>{app.EmailUngVien || t('common.notAvailable')}</td>
                                                <td>{app.TieuDe || t('common.notAvailable')}</td>
                                                <td>{formatDate(app.NgayNop, locale, t('common.notAvailable'))}</td>
                                                <td>
                                                    <span className={`cv-manage-status-pill ${STATUS_CLASS_BY_VALUE[statusValue] || 'default'}`}>
                                                        {statusLabel}
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <div className="cv-manage-row-actions">
                                                        <button
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => openDetails(app)}
                                                        >
                                                            <i className="bi bi-eye me-1"></i>
                                                            {t('employer.applicationManagement.actions.details')}
                                                        </button>

                                                        {(statusValue === 'Đã nộp' || statusValue === 'Đang xem xét') && (
                                                            <>
                                                                <button
                                                                    className="btn btn-sm btn-outline-success"
                                                                    onClick={() => updateApplicationStatus(app.MaUngTuyen, 'Phỏng vấn')}
                                                                    disabled={updating}
                                                                >
                                                                    <i className="bi bi-check2-circle me-1"></i>
                                                                    {t('employer.applicationManagement.actions.inviteInterview')}
                                                                </button>
                                                                <button
                                                                    className="btn btn-sm btn-outline-danger"
                                                                    onClick={() => updateApplicationStatus(app.MaUngTuyen, 'Từ chối')}
                                                                    disabled={updating}
                                                                >
                                                                    <i className="bi bi-x-circle me-1"></i>
                                                                    {t('employer.applicationManagement.actions.reject')}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && filteredApps.length > 0 && (
                        <div className="d-flex justify-content-end mt-3">
                            <SmartPagination
                                from={rangeFrom}
                                to={rangeTo}
                                totalItems={totalFilteredApps}
                                currentPage={safeCurrentPage}
                                pageSize={PAGE_SIZE}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>
            </div>

            {selectedApp && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{t('employer.applicationManagement.detailModal.title')}</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setSelectedApp(null)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <h6 className="text-muted">{t('employer.applicationManagement.detailModal.candidate')}</h6>
                                        <p className="fw-bold mb-0">{selectedApp.TenUngVien || t('common.notAvailable')}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <h6 className="text-muted">{t('employer.applicationManagement.detailModal.email')}</h6>
                                        <p className="mb-0">{selectedApp.EmailUngVien || t('common.notAvailable')}</p>
                                    </div>
                                </div>
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <h6 className="text-muted">{t('employer.applicationManagement.detailModal.position')}</h6>
                                        <p className="mb-0">{selectedApp.TieuDe || t('common.notAvailable')}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <h6 className="text-muted">{t('employer.applicationManagement.detailModal.submittedAt')}</h6>
                                        <p className="mb-0">
                                            {formatDate(selectedApp.NgayNop, locale, t('common.notAvailable'))}
                                        </p>
                                    </div>
                                </div>
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <h6 className="text-muted">{t('employer.applicationManagement.detailModal.status')}</h6>
                                        <span className={`cv-manage-status-pill ${STATUS_CLASS_BY_VALUE[getStatusValue(selectedApp)] || 'default'}`}>
                                            {getStatusLabel(getStatusValue(selectedApp), t)}
                                        </span>
                                    </div>
                                    <div className="col-md-6">
                                        <h6 className="text-muted">{t('employer.applicationManagement.detailModal.applicationCode')}</h6>
                                        <p className="mb-0">{selectedApp.MaUngTuyen}</p>
                                    </div>
                                </div>
                                {selectedApp.ThuGioiThieu && (
                                    <div className="mb-3">
                                        <h6 className="text-muted">{t('employer.applicationManagement.detailModal.coverLetter')}</h6>
                                        <p className="border rounded p-3 bg-light mb-0">
                                            {selectedApp.ThuGioiThieu}
                                        </p>
                                    </div>
                                )}
                                {selectedApp.MaCV && (
                                    <div className="mb-3">
                                        <h6 className="text-muted">{t('employer.applicationManagement.detailModal.attachmentTitle')}</h6>
                                        <div className="d-flex flex-wrap gap-2 align-items-center">
                                            <span className="text-muted">{t('employer.applicationManagement.detailModal.cvCode', { code: selectedApp.MaCV })}</span>
                                            {selectedApp.CvFileAbsoluteUrl ? (
                                                <>
                                                    <a className="btn btn-sm btn-outline-primary" href={selectedApp.CvFileAbsoluteUrl} target="_blank" rel="noreferrer">
                                                        <i className="bi bi-eye me-1"></i> {t('employer.applicationManagement.detailModal.viewCv')}
                                                    </a>
                                                    <a className="btn btn-sm btn-outline-secondary" href={selectedApp.CvFileAbsoluteUrl} download>
                                                        <i className="bi bi-download me-1"></i> {t('employer.applicationManagement.detailModal.downloadCv')}
                                                    </a>
                                                </>
                                            ) : (
                                                <span className="text-danger">{t('employer.applicationManagement.detailModal.noCvFile')}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                {(getStatusValue(selectedApp) === 'Đã nộp' || getStatusValue(selectedApp) === 'Đang xem xét') && (
                                    <>
                                        <button
                                            className="btn btn-success"
                                            onClick={() => updateApplicationStatus(selectedApp.MaUngTuyen, 'Phỏng vấn')}
                                            disabled={updating}
                                        >
                                            <i className="bi bi-check-circle me-1"></i> {t('employer.applicationManagement.actions.inviteInterview')}
                                        </button>
                                        <button
                                            className="btn btn-danger"
                                            onClick={() => updateApplicationStatus(selectedApp.MaUngTuyen, 'Từ chối')}
                                            disabled={updating}
                                        >
                                            <i className="bi bi-x-circle me-1"></i> {t('employer.applicationManagement.actions.reject')}
                                        </button>
                                    </>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedApp(null)}
                                >
                                    {t('employer.applicationManagement.actions.close')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApplicationManagement;
