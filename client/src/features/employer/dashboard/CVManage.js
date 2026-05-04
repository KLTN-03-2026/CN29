import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { API_BASE as CLIENT_API_BASE } from '../../../config/apiBase';

const STATUS_FILTER_KEYS = [
    { key: 'all', labelKey: 'employer.cvManagePage.filters.all', icon: 'bi-collection' },
    { key: 'viewed', labelKey: 'employer.cvManagePage.filters.viewed', icon: 'bi-eye' },
    { key: 'contacted', labelKey: 'employer.cvManagePage.filters.contacted', icon: 'bi-chat-dots' }
];

const STATUS_VALUE_BY_FILTER = {
    viewed: 'Đã xem',
    contacted: 'Đã liên hệ'
};

const STATUS_CLASS_BY_VALUE = {
    'N/A': 'na',
    'Đã xem': 'viewed',
    'Đã liên hệ': 'contacted'
};

const normalizeCvStatus = (status) => {
    const value = String(status || '').trim();
    if (value === 'Đã xem' || value === 'Đã liên hệ') return value;
    return 'N/A';
};

const CVManage = () => {
    const { t } = useTranslation();
    const API_BASE = CLIENT_API_BASE;
    const navigate = useNavigate();
    const [savedCVs, setSavedCVs] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(false);
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
        setLoading(true);
        setError('');
        if (!token) {
            setError(t('employer.cvManagePage.errors.notLoggedIn'));
            setSavedCVs([]);
            setLoading(false);
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
            setLoading(false);
        }
    }, [API_BASE, authHeaders, token]);

    useEffect(() => {
        fetchSavedCVs();
    }, [fetchSavedCVs]);

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
        const fileUrl = String(cv?.cvFileAbsoluteUrl || cv?.cvFileUrl || '').trim();
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

        await setCvStatus(cv.cvId, 'Đã xem', { silent: true });
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
    };

    const openMessageBox = async (cv) => {
        const candidateUserId = Number.parseInt(String(cv?.candidateUserId || ''), 10);
        if (!Number.isFinite(candidateUserId)) {
            setError(t('employer.cvManagePage.errors.missingCandidate'));
            return;
        }

        await setCvStatus(cv.cvId, 'Đã liên hệ', { silent: true });

        const params = new URLSearchParams({
            userId: String(candidateUserId),
            name: String(cv?.candidateName || ''),
            email: String(cv?.candidateEmail || ''),
            cvId: String(cv?.cvId || '')
        });

        navigate(`/employer/messages?${params.toString()}`);
    };

    const counts = useMemo(() => {
        const all = savedCVs.length;
        const viewed = savedCVs.filter((x) => normalizeCvStatus(x.status) === 'Đã xem').length;
        const contacted = savedCVs.filter((x) => normalizeCvStatus(x.status) === 'Đã liên hệ').length;
        return { all, viewed, contacted };
    }, [savedCVs]);

    const filteredSavedCVs = useMemo(() => {
        if (filter === 'all') return savedCVs;
        const statusValue = STATUS_VALUE_BY_FILTER[filter];
        return savedCVs.filter((item) => normalizeCvStatus(item.status) === statusValue);
    }, [filter, savedCVs]);

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

                    {!loading && filteredSavedCVs.length === 0 ? (
                        <div className="text-center py-5">
                            <i className="bi bi-file-earmark-x fs-1 text-muted"></i>
                            <p className="text-muted mt-3">
                                {filter === 'all'
                                    ? t('employer.cvManagePage.emptyAll')
                                    : t('employer.cvManagePage.emptyFiltered')}
                                <br />
                                {t('employer.cvManagePage.emptyHint')}
                            </p>
                        </div>
                    ) : (
                        !loading && (
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
                                        {filteredSavedCVs.map((cv) => {
                                            const statusLabel = normalizeCvStatus(cv.status);
                                            const skills = Array.isArray(cv?.skills) ? cv.skills : [];
                                            const visibleSkills = skills.slice(0, 5);
                                            const extraSkills = Math.max(skills.length - visibleSkills.length, 0);
                                            return (
                                                <tr key={`${cv.savedId}-${cv.cvId}`}>
                                                    <td className="fw-semibold">
                                                        <div>{cv.candidateName || 'N/A'}</div>
                                                        {skills.length > 0 && (
                                                            <div className="cv-skill-list cv-skill-list--compact">
                                                                {visibleSkills.map((skill, index) => (
                                                                    <span key={`${skill?.id || skill?.name || 'skill'}-${index}`} className="cv-skill-chip">
                                                                        <span>{String(skill?.name || skill?.TenKyNang || '').trim()}</span>
                                                                        {skill?.level || skill?.MucDo ? <small>{skill?.level || skill?.MucDo}</small> : null}
                                                                    </span>
                                                                ))}
                                                                {extraSkills > 0 && (
                                                                    <span className="cv-skill-chip cv-skill-chip--more">+{extraSkills}</span>
                                                                )}
                                                            </div>
                                                        )}
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
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default CVManage;
