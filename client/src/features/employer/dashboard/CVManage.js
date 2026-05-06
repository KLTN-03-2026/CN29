import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { API_BASE as CLIENT_API_BASE } from '../../../config/apiBase';

const STATUS_FILTER_KEYS = [
    { key: 'all', labelKey: 'employer.cvManagePage.filters.all', icon: 'bi-collection' },
    { key: 'saved', labelKey: 'employer.cvManagePage.filters.saved', icon: 'bi-bookmark-check' },
    { key: 'applied', labelKey: 'employer.cvManagePage.filters.applied', icon: 'bi-briefcase' }
];

const STATUS_CLASS_BY_VALUE = {
    'N/A': 'na',
    'Đã lưu': 'na',
    'Đã xem': 'viewed',
    'Đã liên hệ': 'contacted',
    'Đã nộp': 'viewed',
    'Đang xem xét': 'contacted',
    'Phỏng vấn': 'suitable',
    'Đề nghị': 'suitable',
    'Từ chối': 'rejected',
    'Đã nhận': 'suitable'
};

const normalizeSavedStatus = (status) => {
    const value = String(status || '').trim();
    if (value === 'Đã lưu' || value === 'Đã xem' || value === 'Đã liên hệ') return value;
    return 'Đã lưu';
};

const formatDate = (value, locale) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    const normalizedLocale = String(locale || '').toLowerCase().startsWith('en') ? 'en-US' : 'vi-VN';
    return new Intl.DateTimeFormat(normalizedLocale, { dateStyle: 'short' }).format(parsed);
};

const CVManage = () => {
    const { t, i18n } = useTranslation();
    const API_BASE = CLIENT_API_BASE;
    const navigate = useNavigate();
    const locale = String(i18n.resolvedLanguage || i18n.language || 'vi');
    const [savedCVs, setSavedCVs] = useState([]);
    const [appliedCVs, setAppliedCVs] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loadingSaved, setLoadingSaved] = useState(false);
    const [loadingApplied, setLoadingApplied] = useState(false);
    const [error, setError] = useState('');

    const STATUS_FILTERS = useMemo(() => STATUS_FILTER_KEYS.map((item) => ({
        ...item,
        label: t(item.labelKey)
    })), [t]);

    const token = localStorage.getItem('token');
    const authHeaders = useMemo(() => ({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    }), [token]);

    const fetchSavedCVs = useCallback(async () => {
        setLoadingSaved(true);
        setError('');
        if (!token) {
            setError(t('employer.cvManagePage.errors.notLoggedIn'));
            setSavedCVs([]);
            setLoadingSaved(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/cvs/saved`, { headers: authHeaders });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || t('employer.cvManagePage.errors.noFile'));
            setSavedCVs(Array.isArray(data?.saved) ? data.saved : []);
        } catch (err) {
            setError(err?.message || 'Có lỗi xảy ra');
            setSavedCVs([]);
        } finally {
            setLoadingSaved(false);
        }
    }, [API_BASE, authHeaders, t, token]);

    const fetchAppliedCVs = useCallback(async () => {
        setLoadingApplied(true);
        setError('');
        if (!token) {
            setError(t('employer.cvManagePage.errors.notLoggedIn'));
            setAppliedCVs([]);
            setLoadingApplied(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/applications`, { headers: authHeaders });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || t('employer.cvManagePage.errors.loadApplied'));
            setAppliedCVs(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err?.message || t('employer.cvManagePage.errors.loadApplied'));
            setAppliedCVs([]);
        } finally {
            setLoadingApplied(false);
        }
    }, [API_BASE, authHeaders, token, t]);

    useEffect(() => {
        fetchSavedCVs();
        fetchAppliedCVs();
    }, [fetchAppliedCVs, fetchSavedCVs]);

    const setCvStatus = async (cvId, status, options = {}) => {
        const { silent = false } = options;
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/cvs/saved/${cvId}`, {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify({ status })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || t('common.error') || 'Unable to update status');

            setSavedCVs((prev) => prev.map((x) => (x.cvId === cvId ? { ...x, status } : x)));
            return true;
        } catch (err) {
            if (!silent) alert(err?.message || 'Có lỗi xảy ra');
            return false;
        }
    };

    const removeSavedCv = async (cvId) => {
        if (!token) return;
        const confirmed = window.confirm(t('employer.cvManagePage.confirm.removeSavedCv'));
        if (!confirmed) return;

        try {
            const res = await fetch(`${API_BASE}/api/cvs/saved/${cvId}`, {
                method: 'DELETE',
                headers: authHeaders
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || 'Không xóa được CV đã lưu');

            setSavedCVs((prev) => prev.filter((item) => item.cvId !== cvId));
        } catch (err) {
            alert(err?.message || 'Có lỗi xảy ra');
        }
    };

    const openCvPreview = async (cv) => {
        const fileUrl = String(cv?.fileUrl || '').trim();
        if (!fileUrl) {
            alert(t('employer.cvManagePage.errors.noFile'));
            return;
        }

        try {
            const response = await fetch(fileUrl, { method: 'HEAD' });
            if (!response.ok && response.status !== 405) {
                alert(t('employer.cvManagePage.errors.fileMissing'));
                return;
            }
        } catch {
            // Keep opening behavior to avoid blocking when HEAD cannot be performed.
        }

        if (cv.source === 'saved') {
            await setCvStatus(cv.cvId, 'Đã xem', { silent: true });
        }
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
    };

    const openMessageBox = async (cv) => {
        const candidateUserId = Number.parseInt(String(cv?.candidateUserId || ''), 10);
        if (!Number.isFinite(candidateUserId)) {
            setError(t('employer.cvManagePage.errors.missingCandidate'));
            return;
        }

        if (cv.source === 'saved') {
            await setCvStatus(cv.cvId, 'Đã liên hệ', { silent: true });
        }

        const params = new URLSearchParams({
            userId: String(candidateUserId),
            name: String(cv?.candidateName || ''),
            email: String(cv?.candidateEmail || ''),
            cvId: String(cv?.cvId || '')
        });

        navigate(`/employer/messages?${params.toString()}`);
    };

    const savedItems = useMemo(() => savedCVs.map((cv) => ({
        source: 'saved',
        key: `saved-${cv.savedId}-${cv.cvId}`,
        cvId: cv.cvId,
        savedId: cv.savedId,
        candidateUserId: cv.candidateUserId,
        candidateName: cv.candidateName || 'N/A',
        candidateEmail: cv.candidateEmail || 'N/A',
        city: cv.city || '',
        experience: cv.experience || '',
        status: cv.status || '',
        fileUrl: cv.cvFileAbsoluteUrl || cv.cvFileUrl || '',
        savedAt: cv.savedAt || '',
        updatedAt: cv.updatedAt || ''
    })), [savedCVs]);

    const appliedItems = useMemo(() => appliedCVs.map((app) => ({
        source: 'applied',
        key: `applied-${app.MaUngTuyen || app.MaCV || app.MaTin}`,
        applicationId: app.MaUngTuyen,
        cvId: app.MaCV,
        candidateUserId: app.MaUngVien,
        candidateName: app.TenUngVien || 'N/A',
        candidateEmail: app.EmailUngVien || 'N/A',
        jobTitle: app.TieuDe || '',
        submittedAt: app.NgayNop || '',
        status: app.TrangThai || '',
        fileUrl: app.CvFileAbsoluteUrl || ''
    })), [appliedCVs]);

    const allItems = useMemo(() => {
        const merged = [...savedItems, ...appliedItems];
        return merged.sort((a, b) => {
            const aDate = a.source === 'applied' ? a.submittedAt : (a.savedAt || a.updatedAt);
            const bDate = b.source === 'applied' ? b.submittedAt : (b.savedAt || b.updatedAt);
            const aTs = Date.parse(aDate || '');
            const bTs = Date.parse(bDate || '');
            return (Number.isNaN(bTs) ? 0 : bTs) - (Number.isNaN(aTs) ? 0 : aTs);
        });
    }, [appliedItems, savedItems]);

    const counts = useMemo(() => {
        const saved = savedItems.length;
        const applied = appliedItems.length;
        return { all: saved + applied, saved, applied };
    }, [appliedItems.length, savedItems.length]);

    const loading = loadingSaved || loadingApplied;

    const showSavedSection = filter === 'all' || filter === 'saved';
    const showAppliedSection = filter === 'all' || filter === 'applied';
    const isEmpty = filter === 'saved'
        ? savedItems.length === 0
        : filter === 'applied'
            ? appliedItems.length === 0
            : allItems.length === 0;

    const renderSavedTable = (items) => (
        <div className="table-responsive">
            <table className="table table-hover align-middle">
                <thead>
                    <tr>
                        <th>{t('employer.cvManagePage.table.candidate')}</th>
                        <th>{t('employer.cvManagePage.table.email')}</th>
                        <th>{t('employer.cvManagePage.table.location')}</th>
                        <th>{t('employer.cvManagePage.table.experience')}</th>
                        <th>{t('employer.cvManagePage.table.status')}</th>
                        <th className="text-end">{t('employer.cvManagePage.table.actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((cv) => {
                        const statusLabel = normalizeSavedStatus(cv.status);
                        return (
                            <tr key={cv.key}>
                                <td className="fw-semibold">
                                    <div>{cv.candidateName || 'N/A'}</div>
                                </td>
                                <td>{cv.candidateEmail || 'N/A'}</td>
                                <td>{cv.city || 'N/A'}</td>
                                <td>{cv.experience || 'N/A'}</td>
                                <td>
                                    <span className={`cv-manage-status-pill ${STATUS_CLASS_BY_VALUE[statusLabel] || 'default'}`}>
                                        {statusLabel}
                                    </span>
                                </td>
                                <td className="text-end">
                                    <div className="cv-manage-row-actions">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary cv-manage-action-icon"
                                            title={t('employer.cvManagePage.actions.viewCv')}
                                            aria-label={t('employer.cvManagePage.actions.viewCv')}
                                            onClick={() => openCvPreview(cv)}
                                        >
                                            <i className="bi bi-eye"></i>
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-info cv-manage-action-icon"
                                            title={t('employer.cvManagePage.actions.message')}
                                            aria-label={t('employer.cvManagePage.actions.message')}
                                            onClick={() => openMessageBox(cv)}
                                        >
                                            <i className="bi bi-chat-dots"></i>
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger cv-manage-action-icon"
                                            title={t('employer.cvManagePage.actions.removeSaved')}
                                            aria-label={t('employer.cvManagePage.actions.removeSaved')}
                                            onClick={() => removeSavedCv(cv.cvId)}
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const renderAppliedTable = (items) => (
        <div className="table-responsive">
            <table className="table table-hover align-middle">
                <thead>
                    <tr>
                        <th>{t('employer.cvManagePage.table.candidate')}</th>
                        <th>{t('employer.cvManagePage.table.email')}</th>
                        <th>{t('employer.cvManagePage.table.jobTitle')}</th>
                        <th>{t('employer.cvManagePage.table.submittedAt')}</th>
                        <th>{t('employer.cvManagePage.table.status')}</th>
                        <th className="text-end">{t('employer.cvManagePage.table.actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((app) => {
                        const statusLabel = String(app.status || 'N/A').trim() || 'N/A';
                        return (
                            <tr key={app.key}>
                                <td className="fw-semibold">{app.candidateName || 'N/A'}</td>
                                <td>{app.candidateEmail || 'N/A'}</td>
                                <td>{app.jobTitle || 'N/A'}</td>
                                <td>{formatDate(app.submittedAt, locale)}</td>
                                <td>
                                    <span className={`cv-manage-status-pill ${STATUS_CLASS_BY_VALUE[statusLabel] || 'default'}`}>
                                        {statusLabel}
                                    </span>
                                </td>
                                <td className="text-end">
                                    <div className="cv-manage-row-actions">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary cv-manage-action-icon"
                                            title={t('employer.cvManagePage.actions.viewCv')}
                                            aria-label={t('employer.cvManagePage.actions.viewCv')}
                                            onClick={() => openCvPreview(app)}
                                        >
                                            <i className="bi bi-eye"></i>
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-info cv-manage-action-icon"
                                            title={t('employer.cvManagePage.actions.message')}
                                            aria-label={t('employer.cvManagePage.actions.message')}
                                            onClick={() => openMessageBox(app)}
                                        >
                                            <i className="bi bi-chat-dots"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const emptyTitle = filter === 'saved'
        ? t('employer.cvManagePage.emptySaved')
        : filter === 'applied'
            ? t('employer.cvManagePage.emptyApplied')
            : t('employer.cvManagePage.emptyAll');
    const emptyHint = filter === 'applied'
        ? t('employer.cvManagePage.emptyAppliedHint')
        : t('employer.cvManagePage.emptyHint');

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0 employer-page-title">{t('employer.cvManagePage.title')}</h2>
            </div>

            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                    <div className="cv-manage-filter-wrap" role="tablist" aria-label={t('employer.cvManagePage.filterAriaLabel')}>
                        {STATUS_FILTERS.map((item) => {
                            const isActive = filter === item.key;
                            const count = counts[item.key] || 0;

                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    className={`cv-manage-filter-btn ${isActive ? 'active' : ''}`}
                                    onClick={() => setFilter(item.key)}
                                >
                                    <span className="cv-manage-filter-icon"><i className={`bi ${item.icon}`}></i></span>
                                    <span className="cv-manage-filter-label">{item.label}</span>
                                    <span className="cv-manage-filter-count">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-body">
                    {error && <div className="alert alert-danger">{error}</div>}

                    {loading && (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">{t('employer.cvManagePage.loading')}</span>
                            </div>
                        </div>
                    )}

                    {!loading && isEmpty ? (
                        <div className="text-center py-5">
                            <i className="bi bi-file-earmark-x fs-1 text-muted"></i>
                            <p className="text-muted mt-3">
                                {emptyTitle}
                                <br />
                                {emptyHint}
                            </p>
                        </div>
                    ) : (
                        !loading && (
                            <>
                                {showSavedSection && savedItems.length > 0 && (
                                    <div className={filter === 'all' ? 'mb-4' : ''}>
                                        {filter === 'all' && (
                                            <h6 className="text-muted mb-3">{t('employer.cvManagePage.filters.saved')}</h6>
                                        )}
                                        {renderSavedTable(savedItems)}
                                    </div>
                                )}
                                {showAppliedSection && appliedItems.length > 0 && (
                                    <div>
                                        {filter === 'all' && (
                                            <h6 className="text-muted mb-3">{t('employer.cvManagePage.filters.applied')}</h6>
                                        )}
                                        {renderAppliedTable(appliedItems)}
                                    </div>
                                )}
                            </>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default CVManage;
