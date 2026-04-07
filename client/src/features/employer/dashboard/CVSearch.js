import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE as CLIENT_API_BASE } from '../../../config/apiBase';

const EXPERIENCE_ENTRIES = [
    { value: '', label: 'Tất cả' },
    { value: '0-1', label: 'Dưới 1 năm' },
    { value: '1-3', label: '1-3 năm' },
    { value: '3-5', label: '3-5 năm' },
    { value: '5+', label: 'Trên 5 năm' }
];

const getProvinceLabel = (item) => {
    if (typeof item === 'string') return item;
    return item?.TenTinh || item?.name || '';
};

const CVSearch = () => {
    const API_BASE = CLIENT_API_BASE;

    const [searchParams, setSearchParams] = useState({
        keyword: '',
        city: '',
        experience: ''
    });

    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

    const [provinces, setProvinces] = useState([]);
    const [loadingProvinces, setLoadingProvinces] = useState(false);

    const [isCityOpen, setIsCityOpen] = useState(false);
    const [isExperienceOpen, setIsExperienceOpen] = useState(false);
    const [cityQuery, setCityQuery] = useState('');

    const cityRef = useRef(null);
    const citySearchInputRef = useRef(null);
    const experienceRef = useRef(null);

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

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (cityRef.current && !cityRef.current.contains(event.target)) {
                setIsCityOpen(false);
            }

            if (experienceRef.current && !experienceRef.current.contains(event.target)) {
                setIsExperienceOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsCityOpen(false);
                setIsExperienceOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        if (!isCityOpen) return;
        requestAnimationFrame(() => {
            citySearchInputRef.current?.focus();
        });
    }, [isCityOpen]);

    const cityEntries = useMemo(() => {
        const fromResults = searchResults
            .map((cv) => String(cv?.city || '').trim())
            .filter(Boolean);

        const unique = [...new Set([...provinces, ...fromResults])];
        return [
            { value: '', label: 'Tất cả' },
            ...unique.map((item) => ({ value: item, label: item }))
        ];
    }, [provinces, searchResults]);

    const visibleCityEntries = useMemo(() => {
        const query = String(cityQuery || '').trim().toLowerCase();
        if (!query) return cityEntries;

        return cityEntries.filter((entry) => entry.value === '' || String(entry.label).toLowerCase().includes(query));
    }, [cityEntries, cityQuery]);

    const selectedCityLabel = searchParams.city || (loadingProvinces ? 'Đang tải...' : 'Tất cả');
    const selectedExperienceLabel = EXPERIENCE_ENTRIES.find((entry) => entry.value === searchParams.experience)?.label || 'Tất cả';

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
        setIsCityOpen(false);
        setIsExperienceOpen(false);

        try {
            const params = new URLSearchParams();
            if (searchParams.keyword) params.append('keyword', searchParams.keyword);
            if (searchParams.city) params.append('city', searchParams.city);
            if (searchParams.experience) params.append('experience', searchParams.experience);

            const res = await fetch(`${API_BASE}/api/cvs/search?${params.toString()}`);
            const data = await res.json().catch(() => null);

            if (!res.ok) throw new Error(data?.error || 'Không tìm được CV');

            setSearchResults(data?.results || []);
        } catch (err) {
            setError(err?.message || 'Có lỗi xảy ra');
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const saveCv = async (cvId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Bạn cần đăng nhập.');
            return;
        }

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
            if (!res.ok) throw new Error(data?.error || 'Không lưu được CV');
            alert('Đã lưu CV vào Quản lý CV');
        } catch (err) {
            alert(err?.message || 'Có lỗi xảy ra');
        }
    };

    const handleChange = (e) => {
        setSearchParams({
            ...searchParams,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div>
            <h2 className="mb-4">Tìm kiếm CV ứng viên</h2>

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                    <form onSubmit={handleSearch}>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label">Từ khóa</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="keyword"
                                    placeholder="Vị trí, kỹ năng, kinh nghiệm..."
                                    value={searchParams.keyword}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-3">
                                <div className="jf-jobs-search-field" ref={cityRef}>
                                    <label>Địa điểm</label>
                                    <div className={`jf-jobs-select ${isCityOpen ? 'is-open' : ''}`}>
                                        <button
                                            type="button"
                                            className="jf-jobs-select-trigger"
                                            onClick={() => {
                                                setIsCityOpen((prev) => !prev);
                                                setIsExperienceOpen(false);
                                                setCityQuery('');
                                            }}
                                            aria-haspopup="listbox"
                                            aria-expanded={isCityOpen}
                                        >
                                            <span className="jf-jobs-select-text">{selectedCityLabel}</span>
                                            <i className="bi bi-chevron-down"></i>
                                        </button>

                                        {isCityOpen ? (
                                            <div className="jf-jobs-select-menu jf-jobs-select-menu--location" role="listbox" aria-label="Chọn địa điểm">
                                                <div className="jf-jobs-select-search-wrap">
                                                    <i className="bi bi-search"></i>
                                                    <input
                                                        ref={citySearchInputRef}
                                                        type="text"
                                                        placeholder="Nhập để tìm tỉnh/thành"
                                                        value={cityQuery}
                                                        onChange={(event) => setCityQuery(event.target.value)}
                                                    />
                                                </div>

                                                <div className="jf-jobs-select-scroll">
                                                    {visibleCityEntries.length === 0 ? (
                                                        <div className="jf-jobs-select-empty">Không tìm thấy tỉnh/thành phù hợp</div>
                                                    ) : (
                                                        visibleCityEntries.map((entry) => (
                                                            <button
                                                                key={`${entry.value || 'all'}-${entry.label}`}
                                                                type="button"
                                                                className={`jf-jobs-select-option ${searchParams.city === entry.value ? 'is-active' : ''}`}
                                                                onClick={() => {
                                                                    updateSearchParam('city', entry.value);
                                                                    setIsCityOpen(false);
                                                                }}
                                                            >
                                                                {entry.label}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="jf-jobs-search-field" ref={experienceRef}>
                                    <label>Kinh nghiệm</label>
                                    <div className={`jf-jobs-select ${isExperienceOpen ? 'is-open' : ''}`}>
                                        <button
                                            type="button"
                                            className="jf-jobs-select-trigger"
                                            onClick={() => {
                                                setIsExperienceOpen((prev) => !prev);
                                                setIsCityOpen(false);
                                            }}
                                            aria-haspopup="listbox"
                                            aria-expanded={isExperienceOpen}
                                        >
                                            <span className="jf-jobs-select-text">{selectedExperienceLabel}</span>
                                            <i className="bi bi-chevron-down"></i>
                                        </button>

                                        {isExperienceOpen ? (
                                            <div className="jf-jobs-select-menu" role="listbox" aria-label="Chọn kinh nghiệm">
                                                {EXPERIENCE_ENTRIES.map((entry) => (
                                                    <button
                                                        key={entry.value || 'all'}
                                                        type="button"
                                                        className={`jf-jobs-select-option ${searchParams.experience === entry.value ? 'is-active' : ''}`}
                                                        onClick={() => {
                                                            updateSearchParam('experience', entry.value);
                                                            setIsExperienceOpen(false);
                                                        }}
                                                    >
                                                        {entry.label}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-12 d-flex justify-content-end">
                                <button type="submit" className="jf-jobs-search-submit px-4">
                                    <i className="bi bi-search me-2"></i>
                                    Tìm kiếm
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
                                <span className="visually-hidden">Đang tìm kiếm...</span>
                            </div>
                            <p className="mt-2">Đang tìm kiếm CV...</p>
                        </div>
                    )}

                    {!loading && !searched && (
                        <div className="text-center py-5">
                            <i className="bi bi-search fs-1 text-muted"></i>
                            <p className="text-muted mt-3">
                                Nhập từ khóa và tiêu chí để tìm kiếm CV ứng viên
                            </p>
                        </div>
                    )}

                    {!loading && searched && searchResults.length === 0 && (
                        <div className="text-center py-5">
                            <i className="bi bi-inbox fs-1 text-muted"></i>
                            <p className="text-muted mt-3">Không tìm thấy CV phù hợp</p>
                        </div>
                    )}

                    {!loading && searchResults.length > 0 && (
                        <div>
                            <div className="mb-3">
                                <h5>Tìm thấy {searchResults.length} CV</h5>
                            </div>
                            <div className="row g-3">
                                {searchResults.map((cv, idx) => (
                                    <div key={idx} className="col-12">
                                        <div className="card h-100 border">
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
                                                        Cập nhật: {cv.updatedAt ? new Date(cv.updatedAt).toLocaleDateString('vi-VN') : 'N/A'}
                                                    </small>
                                                    <button className="btn btn-sm btn-outline-primary" onClick={() => saveCv(cv.cvId)}>
                                                        <i className="bi bi-bookmark-plus me-1"></i>
                                                        Lưu CV
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CVSearch;
