import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import CareerRichTextEditor from '../../career-guide/components/CareerRichTextEditor';
import CalendarDatePicker from '../../../components/date/CalendarDatePicker';
import './JobCreate.css';

const salaryTypes = [
    { value: 'Thỏa thuận', labelKey: 'employer.jobCreatePage.salaryTypes.negotiable' },
    { value: 'Tháng', labelKey: 'employer.jobCreatePage.salaryTypes.monthly' },
    { value: 'Năm', labelKey: 'employer.jobCreatePage.salaryTypes.yearly' },
    { value: 'Khoảng', labelKey: 'employer.jobCreatePage.salaryTypes.range' },
    { value: 'Không xác định', labelKey: 'employer.jobCreatePage.salaryTypes.unknown' }
];
const employmentTypes = [
    { value: 'Toàn thời gian', labelKey: 'employer.jobCreatePage.employmentTypes.fullTime' },
    { value: 'Bán thời gian', labelKey: 'employer.jobCreatePage.employmentTypes.partTime' },
    { value: 'Thực tập', labelKey: 'employer.jobCreatePage.employmentTypes.internship' },
    { value: 'Từ xa', labelKey: 'employer.jobCreatePage.employmentTypes.remote' },
    { value: 'Hợp đồng', labelKey: 'employer.jobCreatePage.employmentTypes.contract' }
];
const statuses = [
    { value: 'Đã đăng', labelKey: 'employer.jobCreatePage.statuses.published' },
    { value: 'Nháp', labelKey: 'employer.jobCreatePage.statuses.draft' }
];
const experienceOptions = [
    { value: 'Không yêu cầu', labelKey: 'employer.jobCreatePage.experience.none' },
    { value: 'Dưới 1 năm', labelKey: 'employer.jobCreatePage.experience.under1' },
    { value: '1 năm', labelKey: 'employer.jobCreatePage.experience.oneYear' },
    { value: '2 năm', labelKey: 'employer.jobCreatePage.experience.twoYears' },
    { value: '3 năm', labelKey: 'employer.jobCreatePage.experience.threeYears' },
    { value: '4 năm', labelKey: 'employer.jobCreatePage.experience.fourYears' },
    { value: '5 năm', labelKey: 'employer.jobCreatePage.experience.fiveYears' },
    { value: 'Trên 5 năm', labelKey: 'employer.jobCreatePage.experience.over5' }
];
const levelOptions = [
    { value: 'Thực tập sinh', labelKey: 'employer.jobCreatePage.levels.intern' },
    { value: 'Nhân viên', labelKey: 'employer.jobCreatePage.levels.staff' },
    { value: 'Trưởng nhóm', labelKey: 'employer.jobCreatePage.levels.teamLead' },
    { value: 'Trưởng/Phó phòng', labelKey: 'employer.jobCreatePage.levels.departmentLead' },
    { value: 'Quản lý / Giám sát', labelKey: 'employer.jobCreatePage.levels.manager' },
    { value: 'Trưởng chi nhánh', labelKey: 'employer.jobCreatePage.levels.branchLead' },
    { value: 'Phó giám đốc', labelKey: 'employer.jobCreatePage.levels.viceDirector' },
    { value: 'Giám đốc', labelKey: 'employer.jobCreatePage.levels.director' }
];
const jobFieldOptions = [
    { value: 'CNTT', labelKey: 'employer.jobCreatePage.fields.it' },
    { value: 'Marketing', labelKey: 'employer.jobCreatePage.fields.marketing' },
    { value: 'Bán hàng', labelKey: 'employer.jobCreatePage.fields.sales' },
    { value: 'Hành chính', labelKey: 'employer.jobCreatePage.fields.admin' },
    { value: 'Kỹ thuật', labelKey: 'employer.jobCreatePage.fields.engineering' },
    { value: 'Tài chính', labelKey: 'employer.jobCreatePage.fields.finance' },
    { value: 'Sản xuất', labelKey: 'employer.jobCreatePage.fields.manufacturing' },
    { value: 'Dịch vụ', labelKey: 'employer.jobCreatePage.fields.services' },
    { value: 'Khác', labelKey: 'employer.jobCreatePage.fields.other' }
];

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

const pad2 = (value) => String(value).padStart(2, '0');

const parseIsoDateParts = (value) => {
    const input = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;

    const [yearRaw, monthRaw, dayRaw] = input.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return null;
    }

    if (month < 1 || month > 12) return null;

    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return null;

    return { year, month, day };
};

const formatIsoDate = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    return `${year}-${month}-${day}`;
};

const JobsStyleSelect = ({
    value,
    options,
    onChange,
    placeholder,
    searchable = false,
    searchPlaceholder,
    locationMode = false,
    disabled = false,
    emptyText
}) => {
    const { t } = useTranslation();
    const rootRef = useRef(null);
    const searchInputRef = useRef(null);
    const defaultPlaceholder = placeholder ?? t('employer.jobCreatePage.select.placeholder');
    const defaultSearchPlaceholder = searchPlaceholder ?? t('employer.jobCreatePage.select.searchPlaceholder');
    const defaultEmptyText = emptyText ?? t('employer.jobCreatePage.select.emptyText');
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');

    const normalizedOptions = useMemo(() => {
        const source = Array.isArray(options) ? options : [];
        return source
            .map((item) => {
                if (!item) return null;
                if (typeof item === 'string') {
                    const value = String(item).trim();
                    return value ? { value, label: value } : null;
                }
                const value = String(item.value ?? item.label ?? '').trim();
                const label = String(item.label ?? item.value ?? '').trim();
                return value ? { value, label } : null;
            })
            .filter(Boolean)
            .filter((item, index, array) => array.findIndex((candidate) => candidate.value === item.value) === index);
    }, [options]);

    const visibleOptions = useMemo(() => {
        const keyword = String(query || '').trim().toLowerCase();
        if (!keyword) return normalizedOptions;
        return normalizedOptions.filter((item) => item.label.toLowerCase().includes(keyword));
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

    const selectedLabel = normalizedOptions.find((item) => item.value === value)?.label || defaultPlaceholder;

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
                                placeholder={defaultSearchPlaceholder}
                            />
                        </div>
                    ) : null}

                    <div className="jf-jobs-select-scroll">
                        {visibleOptions.length === 0 ? (
                            <div className="jf-jobs-select-empty">{defaultEmptyText}</div>
                        ) : (
                            visibleOptions.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    className={`jf-jobs-select-option ${value === item.value ? 'is-active' : ''}`}
                                    onClick={() => {
                                        onChange(item.value);
                                        setIsOpen(false);
                                    }}
                                >
                                    {item.label}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

const DeadlineDateField = ({ value, onChange, disabled = false }) => {
    const { t } = useTranslation();
    const parsed = useMemo(() => parseIsoDateParts(value), [value]);
    const todayIso = useMemo(() => formatIsoDate(new Date()), []);
    const maxDateIso = useMemo(() => {
        const maxYear = new Date().getFullYear() + 7;
        return `${maxYear}-12-31`;
    }, []);

    const setQuickDate = (daysToAdd) => {
        const next = new Date();
        next.setHours(0, 0, 0, 0);
        next.setDate(next.getDate() + daysToAdd);
        onChange(formatIsoDate(next));
    };

    const displayValue = parsed
        ? `${pad2(parsed.day)}/${pad2(parsed.month)}/${parsed.year}`
        : t('employer.jobCreatePage.deadline.noDeadline');

    return (
        <div className="job-create-deadline-picker">
            <CalendarDatePicker
                value={value}
                onChange={onChange}
                placeholder={t('employer.jobCreatePage.deadline.placeholder')}
                disabled={disabled}
                minDate={todayIso}
                maxDate={maxDateIso}
                inputClassName="form-control job-create-deadline-input"
                menuClassName="job-create-deadline-menu"
            />

            <div className="job-create-deadline-actions">
                <button
                    type="button"
                    className="job-create-deadline-chip"
                    onClick={() => setQuickDate(7)}
                    disabled={disabled}
                >
                    {t('employer.jobCreatePage.deadline.quick7')}
                </button>
                <button
                    type="button"
                    className="job-create-deadline-chip"
                    onClick={() => setQuickDate(30)}
                    disabled={disabled}
                >
                    {t('employer.jobCreatePage.deadline.quick30')}
                </button>
                <button
                    type="button"
                    className="job-create-deadline-chip is-clear"
                    onClick={() => {
                        onChange('');
                    }}
                    disabled={disabled}
                >
                    {t('employer.jobCreatePage.deadline.clear')}
                </button>
            </div>

            <small className="job-create-helptext">{displayValue}</small>
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

const normalizeHeading = (value, fallback) => {
    const normalized = String(value || '').trim();
    return normalized || fallback;
};

const normalizeExtraSectionItem = (item) => {
    if (!item || typeof item !== 'object') return null;

    const title = String(
        item.title
        ?? item.TieuDe
        ?? item.tenMuc
        ?? item.label
        ?? ''
    ).trim();

    const content = String(
        item.content
        ?? item.NoiDung
        ?? item.noiDung
        ?? item.html
        ?? item.moTa
        ?? ''
    );

    if (!title && !content) return null;

    return { title, content };
};

const parseExtraSectionsPayload = (rawValue) => {
    if (!rawValue) return [];

    let source = rawValue;
    if (typeof source === 'string') {
        try {
            source = JSON.parse(source);
        } catch {
            return [];
        }
    }

    if (!Array.isArray(source)) return [];

    return source
        .map((item) => normalizeExtraSectionItem(item))
        .filter(Boolean);
};

const JobCreate = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id: jobId } = useParams();
    const token = useMemo(() => localStorage.getItem('token') || '', []);
    const isEdit = Boolean(jobId);
    const extraSectionIdRef = useRef(1);

    const salaryTypeOptions = useMemo(
        () => salaryTypes.map((item) => ({ value: item.value, label: t(item.labelKey) })),
        [t]
    );
    const employmentTypeOptions = useMemo(
        () => employmentTypes.map((item) => ({ value: item.value, label: t(item.labelKey) })),
        [t]
    );
    const statusOptions = useMemo(
        () => statuses.map((item) => ({ value: item.value, label: t(item.labelKey) })),
        [t]
    );
    const experienceLabelOptions = useMemo(
        () => experienceOptions.map((item) => ({ value: item.value, label: t(item.labelKey) })),
        [t]
    );
    const levelLabelOptions = useMemo(
        () => levelOptions.map((item) => ({ value: item.value, label: t(item.labelKey) })),
        [t]
    );
    const jobFieldLabelOptions = useMemo(
        () => jobFieldOptions.map((item) => ({ value: item.value, label: t(item.labelKey) })),
        [t]
    );

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
        skillsText: '',
        deadline: '',
        status: 'Đã đăng'
    });

    const [provinces, setProvinces] = useState([]);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [salaryCurrency, setSalaryCurrency] = useState('VND');
    const [loadingJob, setLoadingJob] = useState(isEdit);
    const [richValues, setRichValues] = useState({
        description: '',
        requirements: '',
        benefits: ''
    });
    const [editorTitles, setEditorTitles] = useState({
        description: t('employer.jobCreatePage.sectionTitles.description'),
        requirements: t('employer.jobCreatePage.sectionTitles.requirements'),
        benefits: t('employer.jobCreatePage.sectionTitles.benefits')
    });
    const [extraSections, setExtraSections] = useState([]);
    const [skillSuggestions, setSkillSuggestions] = useState([]);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [locationModalError, setLocationModalError] = useState('');

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

    useEffect(() => {
        let cancelled = false;

        const fetchSkills = async () => {
            try {
                const res = await fetch('/jobs/skills');
                const data = await res.json().catch(() => ({}));
                if (!res.ok) return;

                const source = Array.isArray(data?.skills)
                    ? data.skills
                    : (Array.isArray(data) ? data : []);

                const normalized = Array.from(new Set(source
                    .map((item) => String(item?.name || item?.TenKyNang || item || '').trim())
                    .filter(Boolean)))
                    .slice(0, 200);

                if (!cancelled) {
                    setSkillSuggestions(normalized);
                }
            } catch {
                if (!cancelled) {
                    setSkillSuggestions([]);
                }
            }
        };

        fetchSkills();
        return () => {
            cancelled = true;
        };
    }, []);

    const setField = (key) => (valueOrEvent) => {
        const value = valueOrEvent && valueOrEvent.target
            ? valueOrEvent.target.value
            : valueOrEvent;
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const setRichField = (key) => (html) => {
        setRichValues((prev) => ({
            ...prev,
            [key]: html
        }));
    };

    const setEditorTitle = (key) => (event) => {
        const nextValue = event?.target?.value ?? '';
        setEditorTitles((prev) => ({
            ...prev,
            [key]: nextValue
        }));
    };

    const addExtraSection = () => {
        const nextId = extraSectionIdRef.current;
        extraSectionIdRef.current += 1;
        setExtraSections((prev) => ([
            ...prev,
            {
                id: nextId,
                title: '',
                content: ''
            }
        ]));
    };

    const removeExtraSection = (id) => {
        setExtraSections((prev) => prev.filter((section) => section.id !== id));
    };

    const updateExtraSection = (id, key, value) => {
        setExtraSections((prev) => prev.map((section) => {
            if (section.id !== id) return section;
            return {
                ...section,
                [key]: value
            };
        }));
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
                if (!res.ok) throw new Error(data.error || t('employer.jobCreatePage.errors.loadJob'));

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
                    skillsText: Array.isArray(data.skills)
                        ? data.skills
                            .map((item) => String(item?.name || item || '').trim())
                            .filter(Boolean)
                            .join(', ')
                        : String(data.skillsText || ''),
                    deadline: data.HanNopHoSo ? String(data.HanNopHoSo).slice(0, 10) : '',
                    status: data.TrangThai || 'Đã đăng'
                });
                const nextRich = {
                    description: data.MoTa || '',
                    requirements: data.YeuCau || '',
                    benefits: data.QuyenLoi || ''
                };
                setRichValues(nextRich);

                setEditorTitles({
                    description: normalizeHeading(
                        data.sectionTitles?.description
                        ?? data.descriptionTitle
                        ?? data.moTaTieuDe,
                        'Mô tả công việc'
                    ),
                    requirements: normalizeHeading(
                        data.sectionTitles?.requirements
                        ?? data.requirementsTitle
                        ?? data.yeuCauTieuDe,
                        'Yêu cầu'
                    ),
                    benefits: normalizeHeading(
                        data.sectionTitles?.benefits
                        ?? data.benefitsTitle
                        ?? data.quyenLoiTieuDe,
                        'Quyền lợi'
                    )
                });

                const nextExtraSections = parseExtraSectionsPayload(
                    data.extraSections
                    ?? data.ExtraSections
                    ?? data.ExtraSectionsJson
                    ?? data.MucBoSung
                    ?? data.MucBoSungJson
                ).map((section) => {
                    const nextId = extraSectionIdRef.current;
                    extraSectionIdRef.current += 1;
                    return {
                        id: nextId,
                        title: section.title,
                        content: section.content
                    };
                });

                setExtraSections(nextExtraSections);
            } catch (err) {
                if (!cancelled) setError(err.message || t('employer.jobCreatePage.errors.loadJob'));
            } finally {
                if (!cancelled) setLoadingJob(false);
            }
        };
        loadJob();
        return () => { cancelled = true; };
    }, [isEdit, jobId, token]);

    useEffect(() => {
        if (!showLocationModal) return undefined;
        if (typeof document === 'undefined') return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [showLocationModal]);

    const submitJob = async () => {
        setSubmitting(true);
        try {
            const payloadExtraSections = extraSections.map((section) => ({
                title: String(section.title || '').trim(),
                content: String(section.content || '')
            }));

            const payloadSectionTitles = {
                description: normalizeHeading(editorTitles.description, t('employer.jobCreatePage.sectionTitles.description')),
                requirements: normalizeHeading(editorTitles.requirements, t('employer.jobCreatePage.sectionTitles.requirements')),
                benefits: normalizeHeading(editorTitles.benefits, t('employer.jobCreatePage.sectionTitles.benefits'))
            };

            const res = await fetch(isEdit ? `/jobs/${jobId}` : '/jobs', {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...form,
                    skills: form.skillsText,
                    description: richValues.description,
                    requirements: richValues.requirements,
                    benefits: richValues.benefits,
                    sectionTitles: payloadSectionTitles,
                    descriptionTitle: payloadSectionTitles.description,
                    requirementsTitle: payloadSectionTitles.requirements,
                    benefitsTitle: payloadSectionTitles.benefits,
                    extraSections: payloadExtraSections,
                    salaryFrom: form.salaryFrom === '' ? null : Math.min(MAX_VND_SALARY, Number(digitsOnly(form.salaryFrom))),
                    salaryTo: form.salaryTo === '' ? null : Math.min(MAX_VND_SALARY, Number(digitsOnly(form.salaryTo)))
                })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || t('employer.jobCreatePage.errors.submitFailure'));
            }

            navigate('/employer/jobs', {
                state: {
                    flash: isEdit ? t('employer.jobCreatePage.notifications.updateSuccess') : t('employer.jobCreatePage.notifications.createSuccess')
                }
            });
        } catch (err) {
            setError(err.message || t('employer.jobCreatePage.errors.generic'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (loadingJob || submitting) return;
        setError('');

        if (!form.title.trim()) {
            setError(t('employer.jobCreatePage.errors.titleRequired'));
            return;
        }
        if (!token) {
            setError(t('employer.jobCreatePage.errors.loginRequired'));
            return;
        }

        setLocationModalError('');
        setShowLocationModal(true);
    };

    const handleConfirmLocationSubmit = async () => {
        if (loadingJob || submitting) return;

        const locationText = String(form.location || '').trim();
        const cityText = String(form.city || '').trim();

        if (!locationText) {
            setLocationModalError(t('employer.jobCreatePage.locationModal.errors.locationRequired'));
            return;
        }

        if (!cityText) {
            setLocationModalError(t('employer.jobCreatePage.locationModal.errors.cityRequired'));
            return;
        }

        setLocationModalError('');
        setShowLocationModal(false);
        await submitJob();
    };

    return (
        <div className="job-create-page">
            <div className="job-create-shell">
                <div className="d-flex justify-content-between align-items-center mb-4 job-create-header">
                    <div>
                        <h2 className="mb-0 employer-page-title">{isEdit ? t('employer.jobCreatePage.titleEdit') : t('employer.jobCreatePage.titleCreate')}</h2>
                    </div>
                    <button
                        type="button"
                        className="btn job-create-back-btn"
                        onClick={() => navigate('/employer/jobs')}
                    >
                        {t('employer.jobCreatePage.buttons.back')}
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
                        <p className="text-muted">{t('employer.jobCreatePage.loadingJob')}</p>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            <div className="col-12">
                                <label className="form-label">{t('employer.jobCreatePage.labels.title')}</label>
                                <input
                                    className="form-control"
                                    value={form.title}
                                    onChange={setField('title')}
                                    placeholder={t('employer.jobCreatePage.placeholders.title')}
                                />
                            </div>

                            <div className="col-12">
                                <input
                                    className="form-control job-create-section-heading-input"
                                    value={editorTitles.description}
                                    onChange={setEditorTitle('description')}
                                    placeholder={t('employer.jobCreatePage.placeholders.descriptionSection')}
                                    disabled={submitting || loadingJob}
                                />
                                <CareerRichTextEditor
                                    value={richValues.description}
                                    onChange={setRichField('description')}
                                    placeholder={t('employer.jobCreatePage.placeholders.descriptionEditor')}
                                    minHeight={180}
                                    toolbarMode="word-basic"
                                    className="job-create-career-editor"
                                />
                            </div>

                            <div className="col-12">
                                <input
                                    className="form-control job-create-section-heading-input"
                                    value={editorTitles.requirements}
                                    onChange={setEditorTitle('requirements')}
                                    placeholder={t('employer.jobCreatePage.placeholders.requirementsSection')}
                                    disabled={submitting || loadingJob}
                                />
                                <CareerRichTextEditor
                                    value={richValues.requirements}
                                    onChange={setRichField('requirements')}
                                    placeholder={t('employer.jobCreatePage.placeholders.requirementsEditor')}
                                    minHeight={180}
                                    toolbarMode="word-basic"
                                    className="job-create-career-editor"
                                />
                            </div>

                            <div className="col-12">
                                <input
                                    className="form-control job-create-section-heading-input"
                                    value={editorTitles.benefits}
                                    onChange={setEditorTitle('benefits')}
                                    placeholder={t('employer.jobCreatePage.placeholders.benefitsSection')}
                                    disabled={submitting || loadingJob}
                                />
                                <CareerRichTextEditor
                                    value={richValues.benefits}
                                    onChange={setRichField('benefits')}
                                    placeholder={t('employer.jobCreatePage.placeholders.benefitsEditor')}
                                    minHeight={170}
                                    toolbarMode="word-basic"
                                    className="job-create-career-editor"
                                />
                            </div>

                            <div className="col-12">
                                <div className="job-create-extra-sections-wrap">
                                    {extraSections.map((section) => (
                                        <div key={section.id} className="card border-0 shadow-sm job-create-card job-create-extra-card">
                                            <div className="card-body job-create-extra-card-body">
                                                <div className="job-create-extra-card-head">
                                                    <button
                                                        type="button"
                                                        className="btn job-create-extra-remove-btn"
                                                        onClick={() => removeExtraSection(section.id)}
                                                        disabled={submitting || loadingJob}
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>

                                                <div className="mb-3">
                                                    <input
                                                        className="form-control job-create-extra-title-input"
                                                        value={section.title}
                                                        onChange={(event) => updateExtraSection(section.id, 'title', event.target.value)}
                                                        placeholder={t('employer.jobCreatePage.placeholders.extraSectionTitle')}
                                                        disabled={submitting || loadingJob}
                                                    />
                                                </div>

                                                <CareerRichTextEditor
                                                    value={section.content}
                                                    onChange={(html) => updateExtraSection(section.id, 'content', html)}
                                                    placeholder={t('employer.jobCreatePage.placeholders.extraSectionEditor')}
                                                    minHeight={160}
                                                    toolbarMode="word-basic"
                                                    className="job-create-career-editor"
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    <div className="job-create-extra-add-wrap">
                                        <button
                                            type="button"
                                            className="btn job-create-cancel-btn job-create-extra-add-btn"
                                            onClick={addExtraSection}
                                            disabled={submitting || loadingJob}
                                        >
                                            {t('employer.jobCreatePage.buttons.addSection')}
                                        </button>
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
                                    {t('employer.jobCreatePage.buttons.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="btn job-create-submit-btn"
                                    disabled={submitting || loadingJob}
                                >
                                    {submitting ? (isEdit ? t('employer.jobCreatePage.buttons.savingEdit') : t('employer.jobCreatePage.buttons.savingCreate')) : (isEdit ? t('employer.jobCreatePage.buttons.saveChanges') : t('employer.jobCreatePage.buttons.createJob'))}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {showLocationModal && typeof document !== 'undefined' ? createPortal(
                <div
                    className="job-create-location-modal-backdrop"
                    role="presentation"
                    onClick={() => {
                        if (submitting) return;
                        setShowLocationModal(false);
                    }}
                >
                    <div
                        className="job-create-location-modal card border-0 shadow-sm job-create-card"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="job-create-location-modal-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="job-create-location-modal-header">
                            <div>
                                <h5 id="job-create-location-modal-title" className="mb-1">
                                    {t('employer.jobCreatePage.locationModal.title')}
                                </h5>
                                <p className="mb-0 text-muted small">
                                    {isEdit
                                        ? t('employer.jobCreatePage.locationModal.description.edit')
                                        : t('employer.jobCreatePage.locationModal.description.create')}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="btn job-create-location-close-btn"
                                onClick={() => setShowLocationModal(false)}
                                disabled={submitting}
                                aria-label={t('employer.jobCreatePage.locationModal.closeAria')}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="job-create-location-modal-body">
                            {locationModalError ? (
                                <div className="alert alert-danger mb-3" role="alert">
                                    {locationModalError}
                                </div>
                            ) : null}

                            <div className="job-create-modal-section">
                                <h6 className="job-create-location-section-title">{t('employer.jobCreatePage.locationModal.sections.location')}</h6>
                                <div className="row g-3 align-items-end">
                                    <div className="col-md-6">
                                        <label className="form-label">{t('employer.jobCreatePage.labels.location')}</label>
                                        <input
                                            className="form-control"
                                            value={form.location}
                                            onChange={setField('location')}
                                            placeholder={t('employer.jobCreatePage.placeholders.location')}
                                            disabled={submitting || loadingJob}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">{t('employer.jobCreatePage.labels.city')}</label>
                                        <JobsStyleSelect
                                            value={form.city}
                                            options={provinces}
                                            onChange={setField('city')}
                                            placeholder={loadingProvinces ? t('employer.jobCreatePage.placeholders.loadingProvinces') : t('employer.jobCreatePage.placeholders.selectProvince')}
                                            searchable
                                            searchPlaceholder={t('employer.jobCreatePage.placeholders.searchProvince')}
                                            locationMode
                                            emptyText={t('employer.jobCreatePage.placeholders.noProvinceFound')}
                                            disabled={loadingProvinces || submitting || loadingJob}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="job-create-modal-section">
                                <h6 className="job-create-location-section-title">{t('employer.jobCreatePage.locationModal.sections.salary')}</h6>
                                <div className="row g-3 align-items-end">
                                    <div className="col-md-3">
                                        <label className="form-label">{t('employer.jobCreatePage.labels.salaryFrom')}</label>
                                        <input
                                            className="form-control"
                                            inputMode="numeric"
                                            value={salaryDisplayValue(form.salaryFrom)}
                                            onChange={setSalaryField('salaryFrom')}
                                            placeholder={salaryCurrency === 'USD' ? t('employer.jobCreatePage.placeholders.salaryFromUsd') : t('employer.jobCreatePage.placeholders.salaryFromVnd')}
                                            disabled={submitting || loadingJob}
                                        />
                                    </div>

                                    <div className="col-md-3">
                                        <label className="form-label">{t('employer.jobCreatePage.labels.salaryTo')}</label>
                                        <input
                                            className="form-control"
                                            inputMode="numeric"
                                            value={salaryDisplayValue(form.salaryTo)}
                                            onChange={setSalaryField('salaryTo')}
                                            placeholder={salaryCurrency === 'USD' ? t('employer.jobCreatePage.placeholders.salaryToUsd') : t('employer.jobCreatePage.placeholders.salaryToVnd')}
                                            disabled={submitting || loadingJob}
                                        />
                                    </div>

                                    <div className="col-md-2">
                                        <label className="form-label">{t('employer.jobCreatePage.labels.currency')}</label>
                                        <JobsStyleSelect
                                            value={salaryCurrency}
                                            options={[
                                                { value: 'VND', label: t('employer.jobCreatePage.currencies.vnd') },
                                                { value: 'USD', label: t('employer.jobCreatePage.currencies.usd') }
                                            ]}
                                            onChange={setSalaryCurrency}
                                            disabled={submitting || loadingJob}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">{t('employer.jobCreatePage.labels.salaryType')}</label>
                                        <JobsStyleSelect
                                            value={form.salaryType}
                                            options={salaryTypeOptions}
                                            onChange={setField('salaryType')}
                                            disabled={submitting || loadingJob}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="job-create-modal-section">
                                <h6 className="job-create-location-section-title">{t('employer.jobCreatePage.locationModal.sections.criteria')}</h6>
                                <div className="row g-3 align-items-end">
                                    <div className="col-md-4">
                                        <label className="form-label">{t('employer.jobCreatePage.labels.experience')}</label>
                                        <JobsStyleSelect
                                            value={form.experience}
                                            options={experienceLabelOptions}
                                            onChange={setField('experience')}
                                            disabled={submitting || loadingJob}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">{t('employer.jobCreatePage.labels.level')}</label>
                                        <JobsStyleSelect
                                            value={form.level}
                                            options={levelLabelOptions}
                                            onChange={setField('level')}
                                            disabled={submitting || loadingJob}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">{t('employer.jobCreatePage.labels.jobField')}</label>
                                        <JobsStyleSelect
                                            value={form.jobField}
                                            options={jobFieldLabelOptions}
                                            onChange={setField('jobField')}
                                            searchable
                                            searchPlaceholder={t('employer.jobCreatePage.placeholders.searchJobField')}
                                            emptyText={t('employer.jobCreatePage.placeholders.noJobFieldFound')}
                                            disabled={submitting || loadingJob}
                                        />
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label">Kỹ năng yêu cầu (phân tách bằng dấu phẩy)</label>
                                        <input
                                            className="form-control job-create-skills-input"
                                            value={form.skillsText}
                                            onChange={setField('skillsText')}
                                            placeholder="Ví dụ: React, Node.js, SQL, Giao tiếp"
                                            list="job-create-skills-suggestions"
                                            disabled={submitting || loadingJob}
                                        />
                                        <small className="job-create-helptext">
                                            Hệ thống sẽ lưu kỹ năng vào bảng KyNang và liên kết trực tiếp với tin tuyển dụng.
                                        </small>
                                        <datalist id="job-create-skills-suggestions">
                                            {skillSuggestions.map((skillName) => (
                                                <option key={skillName} value={skillName} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                            </div>

                            <div className="job-create-modal-section">
                                <h6 className="job-create-location-section-title">{t('employer.jobCreatePage.locationModal.sections.postingSettings')}</h6>
                                <div className="row g-3 align-items-end">
                                    <div className="col-md-4">
                                        <label className="form-label">{t('employer.jobCreatePage.labels.employmentType')}</label>
                                        <JobsStyleSelect
                                            value={form.employmentType}
                                            options={employmentTypeOptions}
                                            onChange={setField('employmentType')}
                                            disabled={submitting || loadingJob}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">{t('employer.jobCreatePage.labels.status')}</label>
                                        <JobsStyleSelect
                                            value={form.status}
                                            options={statusOptions}
                                            onChange={setField('status')}
                                            disabled={submitting || loadingJob}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">{t('employer.jobCreatePage.labels.deadline')}</label>
                                        <DeadlineDateField
                                            value={form.deadline}
                                            onChange={setField('deadline')}
                                            disabled={submitting || loadingJob}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="job-create-location-modal-footer">
                            <button
                                type="button"
                                className="btn job-create-cancel-btn"
                                onClick={() => setShowLocationModal(false)}
                                disabled={submitting}
                            >
                                {t('common.close')}
                            </button>
                            <button
                                type="button"
                                className="btn job-create-submit-btn"
                                onClick={handleConfirmLocationSubmit}
                                disabled={submitting || loadingJob}
                            >
                                {submitting
                                    ? (isEdit ? t('employer.jobCreatePage.buttons.savingEdit') : t('employer.jobCreatePage.buttons.savingCreate'))
                                    : (isEdit ? t('employer.jobCreatePage.buttons.confirmSaveChanges') : t('employer.jobCreatePage.buttons.confirmPublish'))}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            ) : null}
        </div>
        </div>
    );
};

export default JobCreate;