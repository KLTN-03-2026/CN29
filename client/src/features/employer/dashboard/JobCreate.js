import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './JobCreate.css';

const salaryTypes = ['Thỏa thuận', 'Tháng', 'Năm', 'Khoảng', 'Không xác định'];
const employmentTypes = ['Toàn thời gian', 'Bán thời gian', 'Thực tập', 'Từ xa', 'Hợp đồng'];
const statuses = ['Đã đăng', 'Nháp'];
const experienceOptions = ['Không yêu cầu', 'Dưới 1 năm', '1 năm', '2 năm', '3 năm', '4 năm', '5 năm', 'Trên 5 năm'];
const levelOptions = [
    'Thực tập sinh',
    'Nhân viên',
    'Trưởng nhóm',
    'Trưởng/Phó phòng',
    'Quản lý / Giám sát',
    'Trưởng chi nhánh',
    'Phó giám đốc',
    'Giám đốc'
];
const jobFieldOptions = ['CNTT', 'Marketing', 'Bán hàng', 'Hành chính', 'Kỹ thuật', 'Tài chính', 'Sản xuất', 'Dịch vụ', 'Khác'];

const normalizeProvinceEntry = (entry) => {
    if (!entry) return '';
    if (typeof entry === 'string') return entry.trim();
    return String(
        entry.TenTinh
        || entry.name
        || entry.ten
        || entry.province
        || entry.label
        || ''
    ).trim();
};

const RichTextField = ({ label, onChange, rows = 4, placeholder, initialValue = '' }) => {
    const editorRef = useRef(null);
    const selectionRef = useRef(null);
    const composingRef = useRef(false);
    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        insertUnorderedList: false
    });

    // Sync from server-loaded value only.
    useEffect(() => {
        if (editorRef.current && typeof initialValue === 'string') {
            editorRef.current.innerHTML = initialValue;
        }
    }, [initialValue]);

    const emitChange = () => {
        const editor = editorRef.current;
        if (!editor) return;
        onChange(editor.innerHTML || '');
    };

    const placeCaretAtEnd = () => {
        const editor = editorRef.current;
        if (!editor) return;

        const selection = window.getSelection?.();
        if (!selection) return;

        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        selectionRef.current = range.cloneRange();
    };

    const saveSelection = () => {
        const editor = editorRef.current;
        if (!editor) return;

        const selection = window.getSelection?.();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const anchorNode = selection.anchorNode;

        // Only save if selection/caret is inside this editor
        if (anchorNode && editor.contains(anchorNode)) {
            selectionRef.current = range.cloneRange();
        }
    };

    const restoreSelection = () => {
        const editor = editorRef.current;
        if (!editor) return;
        const range = selectionRef.current;
        if (!range) {
            placeCaretAtEnd();
            return;
        }

        if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) {
            return;
        }

        const selection = window.getSelection?.();
        if (!selection) return;
        try {
            selection.removeAllRanges();
            selection.addRange(range);
        } catch {
            // noop
        }
    };

    const updateActiveFormats = () => {
        const editor = editorRef.current;
        if (!editor) return;

        const selection = window.getSelection?.();
        const anchorNode = selection?.anchorNode || null;
        const isInsideEditor = Boolean(anchorNode && editor.contains(anchorNode));

        if (!isInsideEditor) {
            setActiveFormats({ bold: false, italic: false, insertUnorderedList: false });
            return;
        }

        const queryState = (command) => {
            try {
                return Boolean(document.queryCommandState(command));
            } catch {
                return false;
            }
        };

        setActiveFormats({
            bold: queryState('bold'),
            italic: queryState('italic'),
            insertUnorderedList: queryState('insertUnorderedList')
        });
    };

    const applyCommand = (command) => {
        // Toggle formatting at caret (or selection) so user can click once to turn on, click again to turn off.
        const editor = editorRef.current;
        if (!editor) return;

        editor.focus();
        restoreSelection();

        // execCommand is deprecated but widely supported and sufficient for this simple use.
        document.execCommand(command, false, null);

        emitChange();
        saveSelection();
        updateActiveFormats();
    };

    const minHeight = Math.max(96, rows * 24);

    return (
        <div className="col-12">
            <label className="form-label">{label}</label>
            <div className="job-create-rich-toolbar">
                <button
                    type="button"
                    className={`job-create-rich-btn ${activeFormats.bold ? 'is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyCommand('bold')}
                    title="In đậm"
                    aria-label="In đậm"
                    aria-pressed={activeFormats.bold}
                >
                    <strong>B</strong>
                </button>
                <button
                    type="button"
                    className={`job-create-rich-btn ${activeFormats.italic ? 'is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyCommand('italic')}
                    title="In nghiêng"
                    aria-label="In nghiêng"
                    aria-pressed={activeFormats.italic}
                >
                    <em>I</em>
                </button>
                <button
                    type="button"
                    className={`job-create-rich-btn ${activeFormats.insertUnorderedList ? 'is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyCommand('insertUnorderedList')}
                    title="Gạch đầu dòng"
                    aria-label="Gạch đầu dòng"
                    aria-pressed={activeFormats.insertUnorderedList}
                >
                    •
                </button>
                <small className="job-create-rich-hint">Bấm để bật/tắt định dạng tại vị trí đang gõ</small>
            </div>
            <div
                ref={editorRef}
                className="form-control job-create-editor"
                contentEditable
                suppressContentEditableWarning
                onFocus={() => {
                    saveSelection();
                    updateActiveFormats();
                }}
                onKeyUp={() => {
                    saveSelection();
                    updateActiveFormats();
                }}
                onMouseUp={() => {
                    saveSelection();
                    updateActiveFormats();
                }}
                onInput={() => {
                    if (composingRef.current) return;
                    emitChange();
                    saveSelection();
                    updateActiveFormats();
                }}
                onBlur={() => {
                    emitChange();
                    saveSelection();
                    updateActiveFormats();
                }}
                onCompositionStart={() => {
                    composingRef.current = true;
                }}
                onCompositionEnd={() => {
                    composingRef.current = false;
                    emitChange();
                    saveSelection();
                    updateActiveFormats();
                }}
                data-placeholder={placeholder || ''}
                style={{ minHeight, whiteSpace: 'pre-wrap', overflowY: 'auto', textAlign: 'left' }}
            />
            {/* Simple placeholder for contentEditable */}
            <style>{`
                [data-placeholder]:empty:before {
                    content: attr(data-placeholder);
                    color: #6c757d;
                }
            `}</style>
        </div>
    );
};

const JobsStyleSelect = ({
    value,
    options,
    onChange,
    placeholder = 'Chọn',
    searchable = false,
    searchPlaceholder = 'Nhập để tìm...',
    locationMode = false,
    disabled = false,
    emptyText = 'Không tìm thấy lựa chọn'
}) => {
    const rootRef = useRef(null);
    const searchInputRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');

    const normalizedOptions = useMemo(() => {
        const source = Array.isArray(options) ? options : [];
        return Array.from(new Set(source.map((item) => String(item || '').trim()).filter(Boolean)));
    }, [options]);

    const visibleOptions = useMemo(() => {
        const keyword = String(query || '').trim().toLowerCase();
        if (!keyword) return normalizedOptions;
        return normalizedOptions.filter((item) => item.toLowerCase().includes(keyword));
    }, [normalizedOptions, query]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const closeIfOutside = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', closeIfOutside);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeIfOutside);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            return;
        }

        if (!searchable) return;
        const id = window.setTimeout(() => {
            searchInputRef.current?.focus();
        }, 0);
        return () => window.clearTimeout(id);
    }, [isOpen, searchable]);

    const selectedLabel = value || placeholder;

    return (
        <div
            ref={rootRef}
            className={`jf-jobs-select job-create-select ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
        >
            <button
                type="button"
                className="jf-jobs-select-trigger"
                onClick={() => {
                    if (disabled) return;
                    setIsOpen((prev) => !prev);
                }}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                disabled={disabled}
            >
                <span className="jf-jobs-select-text">{selectedLabel}</span>
                <i className="bi bi-chevron-down"></i>
            </button>

            {isOpen ? (
                <div
                    className={`jf-jobs-select-menu ${locationMode ? 'jf-jobs-select-menu--location' : ''}`}
                    role="listbox"
                >
                    {searchable ? (
                        <div className="jf-jobs-select-search-wrap">
                            <i className="bi bi-search"></i>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={searchPlaceholder}
                            />
                        </div>
                    ) : null}

                    <div className="jf-jobs-select-scroll">
                        {visibleOptions.length === 0 ? (
                            <div className="jf-jobs-select-empty">{emptyText}</div>
                        ) : (
                            visibleOptions.map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    className={`jf-jobs-select-option ${value === item ? 'is-active' : ''}`}
                                    onClick={() => {
                                        onChange(item);
                                        setIsOpen(false);
                                    }}
                                >
                                    {item}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

const USD_TO_VND_RATE = 25000;
const MAX_VND_SALARY = 999999999;

const digitsOnly = (value) => String(value || '').replace(/[^0-9]/g, '');

const formatThousandsVi = (digits) => {
    const normalized = digitsOnly(digits);
    if (!normalized) return '';

    const asNumber = Number(normalized);
    if (!Number.isFinite(asNumber)) return normalized;

    return new Intl.NumberFormat('vi-VN').format(asNumber);
};

const vndDigitsToDisplayDigits = (vndDigits, currency) => {
    const normalized = digitsOnly(vndDigits);
    if (!normalized) return '';

    const vnd = Number(normalized);
    if (!Number.isFinite(vnd)) return '';

    if (currency === 'USD') {
        const usd = Math.round(vnd / USD_TO_VND_RATE);
        return String(Math.max(0, usd));
    }

    return String(Math.max(0, Math.round(vnd)));
};

const inputDigitsToVndDigits = (inputDigits, currency) => {
    const normalized = digitsOnly(inputDigits);
    if (!normalized) return '';

    const value = Number(normalized);
    if (!Number.isFinite(value)) return '';

    let vndValue = Math.round(value);
    if (currency === 'USD') {
        vndValue = Math.round(value * USD_TO_VND_RATE);
    }

    const clamped = Math.min(MAX_VND_SALARY, Math.max(0, vndValue));
    return String(clamped);
};

const JobCreate = () => {
    const navigate = useNavigate();
    const { id: jobId } = useParams();
    const token = useMemo(() => localStorage.getItem('token') || '', []);
    const isEdit = Boolean(jobId);

    const [form, setForm] = useState({
        title: '',
        location: '',
        city: '',
        salaryFrom: '',
        salaryTo: '',
        salaryType: 'Thỏa thuận',
        employmentType: 'Toàn thời gian',
        experience: 'Không yêu cầu',
        level: 'Nhân viên',
        jobField: 'CNTT',
        deadline: '',
        status: 'Đã đăng'
    });

    const [provinces, setProvinces] = useState([]);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [salaryCurrency, setSalaryCurrency] = useState('VND');
    const [loadingJob, setLoadingJob] = useState(isEdit);
    const [richInitialValues, setRichInitialValues] = useState({ description: '', requirements: '', benefits: '' });

    // Store rich text HTML without re-rendering the editor on every keystroke
    const richRef = useRef({
        description: '',
        requirements: '',
        benefits: ''
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Fetch provinces on component mount
    useEffect(() => {
        const fetchProvinces = async () => {
            setLoadingProvinces(true);
            try {
                const res = await fetch('/api/provinces');
                if (res.ok) {
                    const payload = await res.json().catch(() => []);
                    const source = Array.isArray(payload)
                        ? payload
                        : Array.isArray(payload?.data)
                            ? payload.data
                            : [];
                    const normalized = Array.from(
                        new Set(source.map(normalizeProvinceEntry).filter(Boolean))
                    ).sort((a, b) => a.localeCompare(b, 'vi'));
                    setProvinces(normalized);
                }
            } catch (err) {
                console.error('Error fetching provinces:', err);
            } finally {
                setLoadingProvinces(false);
            }
        };
        fetchProvinces();
    }, []);

    const setField = (key) => (valueOrEvent) => {
        const value = valueOrEvent && valueOrEvent.target
            ? valueOrEvent.target.value
            : valueOrEvent;
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const setRichField = (key) => (html) => {
        richRef.current[key] = html;
    };

    const setSalaryField = (key) => (e) => {
        const vndDigits = inputDigitsToVndDigits(e.target.value, salaryCurrency);
        setForm((prev) => ({ ...prev, [key]: vndDigits }));
    };

    const salaryDisplayValue = (vndDigits) => {
        const displayDigits = vndDigitsToDisplayDigits(vndDigits, salaryCurrency);
        return formatThousandsVi(displayDigits);
    };

    // Fetch job detail when editing
    useEffect(() => {
        if (!isEdit) return;
        let cancelled = false;
        const loadJob = async () => {
            setLoadingJob(true);
            setError('');
            try {
                const res = await fetch(`/jobs/${jobId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'Không tải được tin tuyển dụng');

                if (cancelled) return;
                setForm({
                    title: data.TieuDe || '',
                    location: data.DiaDiem || '',
                    city: data.ThanhPho || '',
                    salaryFrom: digitsOnly(data.LuongTu ?? ''),
                    salaryTo: digitsOnly(data.LuongDen ?? ''),
                    salaryType: data.KieuLuong || 'Thỏa thuận',
                    employmentType: data.HinhThuc || 'Toàn thời gian',
                    experience: data.KinhNghiem || 'Không yêu cầu',
                    level: data.CapBac || 'Nhân viên',
                    jobField: data.LinhVucCongViec || 'CNTT',
                    deadline: data.HanNopHoSo ? String(data.HanNopHoSo).slice(0, 10) : '',
                    status: data.TrangThai || 'Đã đăng'
                });
                const nextRich = {
                    description: data.MoTa || '',
                    requirements: data.YeuCau || '',
                    benefits: data.QuyenLoi || ''
                };
                richRef.current = nextRich;
                setRichInitialValues(nextRich);
            } catch (err) {
                if (!cancelled) setError(err.message || 'Có lỗi khi tải tin.');
            } finally {
                if (!cancelled) setLoadingJob(false);
            }
        };
        loadJob();
        return () => { cancelled = true; };
    }, [isEdit, jobId, token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loadingJob) return;
        setError('');

        if (!form.title.trim()) {
            setError('Vui lòng nhập tiêu đề tin tuyển dụng.');
            return;
        }
        if (!token) {
            setError('Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(isEdit ? `/jobs/${jobId}` : '/jobs', {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...form,
                    description: richRef.current.description,
                    requirements: richRef.current.requirements,
                    benefits: richRef.current.benefits,
                    salaryFrom: form.salaryFrom === '' ? null : Math.min(MAX_VND_SALARY, Number(digitsOnly(form.salaryFrom))),
                    salaryTo: form.salaryTo === '' ? null : Math.min(MAX_VND_SALARY, Number(digitsOnly(form.salaryTo)))
                })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Đăng tin thất bại.');
            }

            navigate('/employer/jobs', {
                state: {
                    flash: isEdit ? 'Cập nhật tin tuyển dụng thành công!' : 'Đăng tin tuyển dụng thành công!'
                }
            });
        } catch (err) {
            setError(err.message || 'Có lỗi xảy ra.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="job-create-page">
            <div className="job-create-shell">
                <div className="d-flex justify-content-between align-items-center mb-4 job-create-header">
                    <div>
                        <h2 className="mb-0">{isEdit ? 'Chỉnh sửa tin tuyển dụng' : 'Đăng tin tuyển dụng'}</h2>
                    </div>
                    <button
                        type="button"
                        className="btn job-create-back-btn"
                        onClick={() => navigate('/employer/jobs')}
                    >
                        Quay lại
                    </button>
                </div>

                <div className="card border-0 shadow-sm job-create-card">
                    <div className="card-body job-create-card-body">
                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    {loadingJob && (
                        <p className="text-muted">Đang tải tin tuyển dụng...</p>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            <div className="col-12">
                                <label className="form-label">Tiêu đề *</label>
                                <input
                                    className="form-control"
                                    value={form.title}
                                    onChange={setField('title')}
                                    placeholder="VD: Nhân viên Kinh doanh, Backend Developer..."
                                />
                            </div>

                            <RichTextField
                                label="Mô tả công việc"
                                onChange={setRichField('description')}
                                initialValue={richInitialValues.description}
                                rows={6}
                                placeholder="Nhập mô tả công việc..."
                            />

                            <RichTextField
                                label="Yêu cầu"
                                onChange={setRichField('requirements')}
                                initialValue={richInitialValues.requirements}
                                rows={6}
                                placeholder="Nhập yêu cầu ứng viên..."
                            />

                            <RichTextField
                                label="Quyền lợi"
                                onChange={setRichField('benefits')}
                                initialValue={richInitialValues.benefits}
                                rows={5}
                                placeholder="Nhập quyền lợi..."
                            />

                            <div className="col-12">
                                <h5 className="job-create-section-title">Địa điểm làm việc</h5>
                            </div>

                            <div className="col-12">
                                <div className="row g-3 align-items-end">
                                    <div className="col-md-6">
                                        <label className="form-label">Địa điểm</label>
                                        <input
                                            className="form-control"
                                            value={form.location}
                                            onChange={setField('location')}
                                            placeholder="VD: Quận 1, 123 Nguyễn Huệ..."
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">Thành phố</label>
                                        <JobsStyleSelect
                                            value={form.city}
                                            options={provinces}
                                            onChange={setField('city')}
                                            placeholder={loadingProvinces ? 'Đang tải tỉnh/thành...' : 'Chọn tỉnh/thành'}
                                            searchable
                                            searchPlaceholder="Nhập để tìm tỉnh/thành"
                                            locationMode
                                            emptyText="Không tìm thấy tỉnh/thành phù hợp"
                                            disabled={loadingProvinces}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="col-12">
                                <h5 className="job-create-section-title">Mức lương</h5>
                            </div>

                            <div className="col-12">
                                <div className="row g-3 align-items-end">
                                    <div className="col-md-3">
                                        <label className="form-label">Lương từ</label>
                                        <input
                                            className="form-control"
                                            inputMode="numeric"
                                            value={salaryDisplayValue(form.salaryFrom)}
                                            onChange={setSalaryField('salaryFrom')}
                                            placeholder={salaryCurrency === 'USD' ? 'VD: 1.000' : 'VD: 10.000.000'}
                                        />
                                    </div>

                                    <div className="col-md-3">
                                        <label className="form-label">Lương đến</label>
                                        <input
                                            className="form-control"
                                            inputMode="numeric"
                                            value={salaryDisplayValue(form.salaryTo)}
                                            onChange={setSalaryField('salaryTo')}
                                            placeholder={salaryCurrency === 'USD' ? 'VD: 2.000' : 'VD: 30.000.000'}
                                        />
                                    </div>

                                    <div className="col-md-2">
                                        <label className="form-label">Tiền tệ</label>
                                        <JobsStyleSelect
                                            value={salaryCurrency}
                                            options={['VND', 'USD']}
                                            onChange={setSalaryCurrency}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">Kiểu lương</label>
                                        <JobsStyleSelect
                                            value={form.salaryType}
                                            options={salaryTypes}
                                            onChange={setField('salaryType')}
                                        />
                                    </div>

                                </div>
                            </div>

                            <div className="col-12">
                                <h5 className="job-create-section-title">Tiêu chí tuyển dụng</h5>
                            </div>

                            <div className="col-12">
                                <div className="row g-3 align-items-end">
                                    <div className="col-md-4">
                                        <label className="form-label">Kinh nghiệm</label>
                                        <JobsStyleSelect
                                            value={form.experience}
                                            options={experienceOptions}
                                            onChange={setField('experience')}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">Cấp bậc</label>
                                        <JobsStyleSelect
                                            value={form.level}
                                            options={levelOptions}
                                            onChange={setField('level')}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">Lĩnh vực công việc</label>
                                        <JobsStyleSelect
                                            value={form.jobField}
                                            options={jobFieldOptions}
                                            onChange={setField('jobField')}
                                            searchable
                                            searchPlaceholder="Nhập để tìm lĩnh vực"
                                            emptyText="Không tìm thấy lĩnh vực phù hợp"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="col-12">
                                <div className="row g-3 align-items-end">
                                    <div className="col-md-4">
                                        <label className="form-label">Hình thức</label>
                                        <JobsStyleSelect
                                            value={form.employmentType}
                                            options={employmentTypes}
                                            onChange={setField('employmentType')}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">Trạng thái</label>
                                        <JobsStyleSelect
                                            value={form.status}
                                            options={statuses}
                                            onChange={setField('status')}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">Hạn nộp hồ sơ</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={form.deadline}
                                            onChange={setField('deadline')}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 d-flex gap-2 justify-content-end pt-2">
                                <button
                                    type="button"
                                    className="btn job-create-cancel-btn"
                                    onClick={() => navigate('/employer/jobs')}
                                    disabled={submitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn job-create-submit-btn"
                                    disabled={submitting || loadingJob}
                                >
                                    {submitting ? (isEdit ? 'Đang lưu...' : 'Đang đăng...') : (isEdit ? 'Lưu thay đổi' : 'Đăng tin')}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        </div>
    );
};

export default JobCreate;