import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { API_BASE as CLIENT_API_BASE } from '../../../config/apiBase';

const getProvinceLabel = (item) => {
    if (typeof item === 'string') return item;
    return item?.TenTinh || item?.name || '';
};

const CVSearch = () => {
    const { t, i18n } = useTranslation('translation');
    const API_BASE = CLIENT_API_BASE;
    const navigate = useNavigate();

    const EXPERIENCE_ENTRIES = useMemo(() => [
        { value: '', label: t('employer.cvSearchPage.filters.experience.all') },
        { value: '0-1', label: t('employer.cvSearchPage.filters.experience.under1') },
        { value: '1-3', label: t('employer.cvSearchPage.filters.experience.1to3') },
        { value: '3-5', label: t('employer.cvSearchPage.filters.experience.3to5') },
        { value: '5+', label: t('employer.cvSearchPage.filters.experience.over5') }
    ], [t, i18n.language]);

    const [searchParams, setSearchParams] = useState({
        keyword: '',
        city: '',
        experience: ''
    });

    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);
    const [savedCvIds, setSavedCvIds] = useState(() => new Set());
    const [savingCvIds, setSavingCvIds] = useState(() => new Set());
    const [savedHighlightIds, setSavedHighlightIds] = useState(() => new Set());

    const [provinces, setProvinces] = useState([]);
    const [loadingProvinces, setLoadingProvinces] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const loadProvinces = async () => {
            setLoadingProvinces(true);
            try {
                const response = await fetch(`${API_BASE}/api/provinces`);
                const data = await response.json().catch(() => []);
                if (!response.ok || !Array.isArray(data)) return;

                const mapped = data
                    .map(getProvinceLabel)
                    .map((value) => String(value || '').trim())
                    .filter(Boolean);

                if (!cancelled) setProvinces(mapped);
            } catch {
                if (!cancelled) setProvinces([]);
            } finally {
                if (!cancelled) setLoadingProvinces(false);
            }
        };

        loadProvinces();
        return () => {
            cancelled = true;
        };
    }, [API_BASE]);

    const markCvAsSaved = (cvId) => {
        setSavedCvIds((prev) => {
            const next = new Set(prev);
            next.add(cvId);
            return next;
        });

        setSavedHighlightIds((prev) => {
            const next = new Set(prev);
            next.add(cvId);
            return next;
        });

        window.setTimeout(() => {
            setSavedHighlightIds((prev) => {
                const next = new Set(prev);
                next.delete(cvId);
                return next;
            });
        }, 1300);
    };

    useEffect(() => {
        let cancelled = false;

        const loadSavedCvIds = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setSavedCvIds(new Set());
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/cvs/saved`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const data = await res.json().catch(() => null);
                if (!res.ok) return;

                const ids = new Set(
                    (Array.isArray(data?.saved) ? data.saved : [])
                        .map((item) => Number.parseInt(String(item?.cvId || ''), 10))
                        .filter((value) => Number.isFinite(value))
                );

                if (!cancelled) setSavedCvIds(ids);
            } catch {
                if (!cancelled) setSavedCvIds(new Set());
            }
        };

        loadSavedCvIds();
        return () => {
            cancelled = true;
        };
    }, [API_BASE]);

    const cityEntries = useMemo(() => {
        const fromResults = searchResults
            .map((cv) => String(cv?.city || '').trim())
            .filter(Boolean);

        const unique = [...new Set([...provinces, ...fromResults])];
        return [
            { value: '', label: t('employer.cvSearchPage.filters.location.all') },
            ...unique.map((item) => ({ value: item, label: item }))
        ];
    }, [provinces, searchResults, t, i18n.language]);

    const updateSearchParam = (name, value) => {
        setSearchParams((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSearched(true);

        try {
            const params = new URLSearchParams();
            if (searchParams.keyword) params.append('keyword', searchParams.keyword);
            if (searchParams.city) params.append('city', searchParams.city);
            if (searchParams.experience) params.append('experience', searchParams.experience);

            const res = await fetch(`${API_BASE}/api/cvs/search?${params.toString()}`);
            const data = await res.json().catch(() => null);

            if (!res.ok) throw new Error(data?.error || t('employer.cvSearchPage.errors.searchFailed'));

            setSearchResults(data?.results || []);
        } catch (err) {
            setError(err?.message || t('employer.cvSearchPage.errors.generic'));
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const saveCv = async (cvId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError(t('employer.cvSearchPage.errors.needSignIn'));
            return;
        }

        if (savedCvIds.has(cvId)) {
            return;
        }

        setSavingCvIds((prev) => {
            const next = new Set(prev);
            next.add(cvId);
            return next;
        });

        try {
            const res = await fetch(`${API_BASE}/api/cvs/saved`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cvId })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || t('employer.cvSearchPage.errors.generic'));
            markCvAsSaved(cvId);
        } catch (err) {
            alert(err?.message || t('employer.cvSearchPage.errors.generic'));
        } finally {
            setSavingCvIds((prev) => {
                const next = new Set(prev);
                next.delete(cvId);
                return next;
            });
        }
    };

    const openCvPreview = async (cv) => {
        const cvId = Number.parseInt(String(cv?.cvId || ''), 10);
        const previewUrl = Number.isFinite(cvId) ? `${API_BASE}/api/cvs/preview/${cvId}` : '';
        if (!previewUrl) {
            alert(t('employer.cvSearchPage.errors.noFileAttachment'));
            return;
        }

        try {
            const response = await fetch(previewUrl, { method: 'HEAD' });
            if (!response.ok && response.status !== 405) {
                alert(t('employer.cvSearchPage.errors.fileMissing'));
                return;
            }
        } catch {
            // If preflight check fails unexpectedly, still try opening in a new tab.
        }

        window.open(previewUrl, '_blank', 'noopener,noreferrer');
    };

    const hasCvAttachment = (cv) => Boolean(String(cv?.cvFileAbsoluteUrl || cv?.cvFileUrl || '').trim());
    const getCvPreviewHint = (cv) => {
        if (hasCvAttachment(cv)) return t('employer.cvSearchPage.hint.hasAttachment');
        if (String(cv?.cvFileName || '').trim()) return t('employer.cvSearchPage.hint.fileMissing');
        return t('employer.cvSearchPage.hint.noAttachment');
    };

    const openMessageBox = (cv) => {
        const candidateUserId = Number.parseInt(String(cv?.candidateUserId || ''), 10);
        if (!Number.isFinite(candidateUserId)) {
            setError(t('employer.cvSearchPage.errors.noCandidate'));
            return;
        }

        const params = new URLSearchParams({
            userId: String(candidateUserId),
            name: String(cv?.candidateName || ''),
            email: String(cv?.candidateEmail || '')
        });

        navigate(`/employer/messages?${params.toString()}`);
    };

    const handleChange = (e) => {
        setSearchParams({
            ...searchParams,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div>
            <h2 className="mb-4 employer-page-title">{t('employer.cvSearchPage.title')}</h2>

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                    <form onSubmit={handleSearch}>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label">{t('employer.cvSearchPage.form.keywordLabel')}</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="keyword"
                                    placeholder={t('employer.cvSearchPage.form.keywordPlaceholder')}
                                    value={searchParams.keyword}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-3">
                                <div className="jf-jobs-search-field">
                                    <label>{t('employer.cvSearchPage.form.locationLabel')}</label>
                                    <div className="jf-jobs-select">
                                        <select
                                            className="jf-jobs-select-trigger jf-jobs-native-select"
                                            name="city"
                                            value={searchParams.city}
                                            onChange={(event) => updateSearchParam('city', event.target.value)}
                                            aria-label={t('employer.cvSearchPage.aria.locationListbox')}
                                        >
                                            {cityEntries.map((entry) => (
                                                <option key={`${entry.value || 'all'}-${entry.label}`} value={entry.value}>
                                                    {entry.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="jf-jobs-search-field">
                                    <label>{t('employer.cvSearchPage.form.experienceLabel')}</label>
                                    <div className="jf-jobs-select">
                                        <select
                                            className="jf-jobs-select-trigger jf-jobs-native-select"
                                            name="experience"
                                            value={searchParams.experience}
                                            onChange={(event) => updateSearchParam('experience', event.target.value)}
                                            aria-label={t('employer.cvSearchPage.aria.experienceListbox')}
                                        >
                                            {EXPERIENCE_ENTRIES.map((entry) => (
                                                <option key={entry.value || 'all'} value={entry.value}>
                                                    {entry.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-12 d-flex justify-content-end">
                                <button type="submit" className="jf-jobs-search-submit px-4">
                                    <i className="bi bi-search me-2"></i>
                                    {t('employer.cvSearchPage.form.searchButton')}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-body">
                    {error && <div className="alert alert-danger">{error}</div>}
                    
                    {loading && (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">{t('employer.cvSearchPage.loadingSearch')}</span>
                            </div>
                            <p className="mt-2">{t('employer.cvSearchPage.searchingResults')}</p>
                        </div>
                    )}

                    {!loading && !searched && (
                        <div className="text-center py-5">
                            <i className="bi bi-search fs-1 text-muted"></i>
                            <p className="text-muted mt-3">
                                {t('employer.cvSearchPage.beforeSearchHint')}
                            </p>
                        </div>
                    )}

                    {!loading && searched && searchResults.length === 0 && (
                        <div className="text-center py-5">
                            <i className="bi bi-inbox fs-1 text-muted"></i>
                            <p className="text-muted mt-3">{t('employer.cvSearchPage.noResults')}</p>
                        </div>
                    )}

                    {!loading && searchResults.length > 0 && (
                        <div>
                            <div className="mb-3">
                                <h5>{t('employer.cvSearchPage.foundResults', { count: searchResults.length })}</h5>
                            </div>
                            <div className="row g-3">
                                {searchResults.map((cv, idx) => {
                                    const parsedCvId = Number.parseInt(String(cv?.cvId || ''), 10);
                                    const isSaved = Number.isFinite(parsedCvId) && savedCvIds.has(parsedCvId);
                                    const isSaving = Number.isFinite(parsedCvId) && savingCvIds.has(parsedCvId);
                                    const isHighlighted = Number.isFinite(parsedCvId) && savedHighlightIds.has(parsedCvId);
                                    return (
                                        <div key={idx} className="col-12">
                                            <div className={`card h-100 border cv-search-card ${isSaved ? 'is-saved' : ''} ${isHighlighted ? 'saved-highlight' : ''}`}>
                                                <div className="card-body">
                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                        <div>
                                                            <h5 className="card-title mb-1">
                                                                {cv.candidateName}
                                                            </h5>
                                                            <p className="text-muted small mb-2">
                                                                <i className="bi bi-envelope me-1"></i>
                                                                {cv.candidateEmail}
                                                                {cv.candidatePhone && (
                                                                    <>
                                                                        {' • '}
                                                                        <i className="bi bi-telephone me-1"></i>
                                                                        {cv.candidatePhone}
                                                                    </>
                                                                )}
                                                            </p>
                                                        </div>
                                                        <span className="badge bg-primary">{cv.title}</span>
                                                    </div>

                                                    {cv.summary && (
                                                        <p className="card-text mb-2">{cv.summary}</p>
                                                    )}

                                                    <div className="d-flex flex-wrap gap-2 mb-2">
                                                        {cv.industry && (
                                                            <span className="badge bg-secondary">
                                                                <i className="bi bi-briefcase me-1"></i>
                                                                {cv.industry}
                                                            </span>
                                                        )}
                                                        {cv.city && (
                                                            <span className="badge bg-info">
                                                                <i className="bi bi-geo-alt me-1"></i>
                                                                {cv.city}
                                                            </span>
                                                        )}
                                                        {cv.experience && (
                                                            <span className="badge bg-success">
                                                                <i className="bi bi-clock-history me-1"></i>
                                                                {cv.experience}
                                                            </span>
                                                        )}
                                                        {cv.level && (
                                                            <span className="badge bg-warning text-dark">
                                                                <i className="bi bi-star me-1"></i>
                                                                {cv.level}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <small className="text-muted">
                                                            {t('employer.cvSearchPage.results.updatedAt')} {cv.updatedAt ? new Date(cv.updatedAt).toLocaleDateString('vi-VN') : 'N/A'}
                                                        </small>
                                                        <div className="d-flex gap-2">
                                                            <button
                                                                className="btn btn-sm btn-outline-secondary"
                                                                onClick={() => openCvPreview(cv)}
                                                                disabled={!hasCvAttachment(cv)}
                                                                title={getCvPreviewHint(cv)}
                                                            >
                                                                <i className="bi bi-file-earmark-text me-1"></i>
                                                                {t('employer.cvSearchPage.actions.viewCv')}
                                                            </button>
                                                            <button
                                                                className={`btn btn-sm cv-search-save-btn ${isSaved ? 'btn-success is-saved' : 'btn-outline-primary'}`}
                                                                onClick={() => saveCv(parsedCvId)}
                                                                disabled={isSaved || isSaving || !Number.isFinite(parsedCvId)}
                                                            >
                                                                <i className={`bi ${isSaved ? 'bi-bookmark-check-fill' : 'bi-bookmark-plus'} me-1`}></i>
                                                                {isSaved ? t('employer.cvSearchPage.actions.saved') : (isSaving ? t('employer.cvSearchPage.actions.saving') : t('employer.cvSearchPage.actions.saveCv'))}
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-primary"
                                                                onClick={() => openMessageBox(cv)}
                                                            >
                                                                <i className="bi bi-chat-dots me-1"></i>
                                                                {t('employer.cvSearchPage.actions.message')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CVSearch;
