import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, PencilLine, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SmartPagination from '../../components/SmartPagination';
import './AdminTemplateManager.css';

const EMPTY_TEMPLATE_FORM = {
    MaTemplateCV: null,
    TenTemplate: '',
    Slug: '',
    MoTa: '',
    ThumbnailUrl: '',
    PhongCachCV: 'professional',
    HtmlContent: '',
    TrangThai: 1,
    NgayTao: '',
    NgayCapNhat: ''
};

const TEMPLATE_STYLE_OPTIONS = [
    { value: 'professional', labelKey: 'admin.templatesPage.styleOptions.professional' },
    { value: 'creative', labelKey: 'admin.templatesPage.styleOptions.creative' },
    { value: 'minimal', labelKey: 'admin.templatesPage.styleOptions.minimal' },
    { value: 'modern', labelKey: 'admin.templatesPage.styleOptions.modern' }
];

const TEMPLATE_PAGE_SIZE = 10;

const normalizeTemplateStyle = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return TEMPLATE_STYLE_OPTIONS.some((item) => item.value === normalized) ? normalized : 'professional';
};

const slugify = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const normalizeTemplate = (template) => ({
    MaTemplateCV: Number(template?.MaTemplateCV || template?.id || 0) || null,
    TenTemplate: String(template?.TenTemplate || template?.name || ''),
    Slug: String(template?.Slug || template?.slug || ''),
    MoTa: String(template?.MoTa || template?.description || ''),
    ThumbnailUrl: String(template?.ThumbnailUrl || template?.thumbnailUrl || template?.thumbnail_url || ''),
    PhongCachCV: normalizeTemplateStyle(template?.PhongCachCV || template?.style),
    HtmlContent: String(template?.HtmlContent || template?.htmlContent || ''),
    TrangThai: Number(template?.TrangThai ?? template?.status ?? 1) === 0 ? 0 : 1,
    NgayTao: String(template?.NgayTao || template?.createdAt || ''),
    NgayCapNhat: String(template?.NgayCapNhat || template?.updatedAt || '')
});

const normalizeTemplatePagination = (pagination, fallback = {}) => {
    const fallbackTotal = Math.max(0, Number(fallback?.total) || 0);
    const fallbackLimit = Math.max(1, Number(fallback?.limit) || TEMPLATE_PAGE_SIZE);
    const fallbackOffset = Math.max(0, Number(fallback?.offset) || 0);

    const total = Math.max(0, Number(pagination?.total ?? fallbackTotal) || 0);
    const limit = Math.max(1, Number(pagination?.limit ?? fallbackLimit) || fallbackLimit);
    const offset = Math.max(0, Number(pagination?.offset ?? fallbackOffset) || 0);

    const from = total > 0 ? Math.min(total, Math.max(1, Number(pagination?.from ?? (offset + 1)) || 1)) : 0;
    const to = total > 0
        ? Math.min(total, Math.max(from, Number(pagination?.to ?? (offset + limit)) || from))
        : 0;

    return {
        from,
        to,
        total,
        limit,
        offset
    };
};

const formatDate = (value, locale = 'vi-VN') => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(locale);
};

const AVATAR_OVERLAY_SELECTORS = [
    '.avatar-overlay',
    '[data-field="avatarOverlay"]',
    '[data-cv-avatar-overlay]'
];

const stripAvatarOverlayFromHtml = (value) => {
    const raw = String(value || '');
    if (!raw.trim()) return raw;

    if (typeof DOMParser === 'undefined') {
        return raw;
    }

    try {
        const hasHtmlTag = /<html[\s>]/i.test(raw);
        const parser = new DOMParser();
        const doc = parser.parseFromString(raw, 'text/html');

        AVATAR_OVERLAY_SELECTORS.forEach((selector) => {
            doc.querySelectorAll(selector).forEach((element) => element.remove());
        });

        if (hasHtmlTag && doc.documentElement) {
            return `<!doctype html>\n${doc.documentElement.outerHTML}`;
        }

        return doc.body ? doc.body.innerHTML : raw;
    } catch {
        return raw;
    }
};

const AdminTemplateManager = ({ API_BASE, authHeaders, requestConfirm, mode = 'list' }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();

    const currentLocale = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase().startsWith('en')
        ? 'en-US'
        : 'vi-VN';

    const translatedStyleOptions = useMemo(
        () => TEMPLATE_STYLE_OPTIONS.map((option) => ({
            ...option,
            label: t(option.labelKey)
        })),
        [t, i18n.resolvedLanguage, i18n.language]
    );

    const isCreateMode = mode === 'create';
    const isListMode = !isCreateMode;

    const templateIdFromQuery = useMemo(() => {
        if (!isCreateMode) return null;
        const params = new URLSearchParams(location.search || '');
        const parsed = Number(params.get('templateId') || 0);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }, [isCreateMode, location.search]);

    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [workingTemplateId, setWorkingTemplateId] = useState(null);

    const [searchInput, setSearchInput] = useState('');
    const [searchText, setSearchText] = useState('');
    const [listRange, setListRange] = useState({
        from: 1,
        to: TEMPLATE_PAGE_SIZE
    });
    const [listPagination, setListPagination] = useState({
        from: 0,
        to: 0,
        total: 0,
        limit: TEMPLATE_PAGE_SIZE,
        offset: 0
    });

    const [editorTab, setEditorTab] = useState('basic');
    const [quickPreview, setQuickPreview] = useState(false);
    const [form, setForm] = useState(EMPTY_TEMPLATE_FORM);
    const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
    const [thumbnailInputKey, setThumbnailInputKey] = useState(0);

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [successToast, setSuccessToast] = useState({
        open: false,
        text: ''
    });
    const successToastTimerRef = useRef(null);

    const [modalPreview, setModalPreview] = useState({
        open: false,
        title: '',
        html: ''
    });

    const sanitizedPreviewHtml = useMemo(
        () => stripAvatarOverlayFromHtml(form.HtmlContent || ''),
        [form.HtmlContent]
    );

    const endpoint = useMemo(() => `${API_BASE}/api/admin/templates`, [API_BASE]);
    const authAuthorization = useMemo(() => String(authHeaders?.Authorization || ''), [authHeaders]);

    const showSuccessToast = (text) => {
        if (successToastTimerRef.current) {
            clearTimeout(successToastTimerRef.current);
        }

        setSuccessToast({
            open: true,
            text: String(text || '').trim()
        });

        successToastTimerRef.current = window.setTimeout(() => {
            setSuccessToast((prev) => ({
                ...prev,
                open: false
            }));
            successToastTimerRef.current = null;
        }, 2600);
    };

    useEffect(() => () => {
        if (successToastTimerRef.current) {
            clearTimeout(successToastTimerRef.current);
            successToastTimerRef.current = null;
        }
    }, []);

    const forceReLogin = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
    };

    const fetchJson = async (url, options = {}) => {
        const res = await fetch(url, options);
        const data = await res.json().catch(() => null);

        if (!res.ok && [401, 403].includes(res.status)) {
            const message = String(data?.error || data?.message || '').trim();
            if (/token|access token|expired|insufficient permissions/i.test(message)) {
                forceReLogin();
                throw new Error(t('admin.templatesPage.messages.sessionExpired'));
            }
        }

        if (!res.ok || !data?.success) {
            throw new Error(data?.error || t('admin.templatesPage.messages.requestFailed'));
        }
        return data;
    };

    const loadTemplates = async (nextSearch = searchText, nextRange = listRange) => {
        setLoading(true);
        setError('');

        try {
            const safeFrom = Math.max(1, Number(nextRange?.from) || 1);
            const safeTo = Math.max(safeFrom, Number(nextRange?.to) || (safeFrom + TEMPLATE_PAGE_SIZE - 1));
            const query = new URLSearchParams({
                from: String(safeFrom),
                to: String(safeTo)
            });
            if (nextSearch) query.set('search', nextSearch);

            const data = await fetchJson(`${endpoint}?${query.toString()}`, {
                headers: authHeaders
            });

            const rows = Array.isArray(data?.templates) ? data.templates : [];
            setTemplates(rows.map(normalizeTemplate));
            setListPagination(normalizeTemplatePagination(data?.pagination, {
                total: Number(data?.total ?? rows.length) || rows.length,
                limit: safeTo - safeFrom + 1,
                offset: safeFrom - 1
            }));
            setListRange({ from: safeFrom, to: safeTo });
        } catch (err) {
            setError(err?.message || t('admin.templatesPage.messages.loadListFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isListMode) return;
        const initialRange = { from: 1, to: TEMPLATE_PAGE_SIZE };
        setListRange(initialRange);
        loadTemplates('', initialRange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpoint, isListMode]);

    const resetEditor = () => {
        setForm(EMPTY_TEMPLATE_FORM);
        setEditorTab('basic');
        setQuickPreview(false);
        setError('');
        setMessage('');

        if (isCreateMode && location.search) {
            navigate('/admin/templates/create', { replace: true });
        }
    };

    const goToCreatePage = (templateId = null) => {
        const query = templateId ? `?templateId=${templateId}` : '';
        navigate(`/admin/templates/create${query}`);
    };

    const loadTemplateById = async (id) => {
        const data = await fetchJson(`${endpoint}/${id}`, {
            headers: authHeaders
        });
        return normalizeTemplate(data.template || {});
    };

    const handleEdit = async (id) => {
        setWorkingTemplateId(id);
        setError('');
        setMessage('');

        try {
            const detail = await loadTemplateById(id);
            setForm(detail);
            setEditorTab('basic');
            setQuickPreview(false);
        } catch (err) {
            setError(err?.message || t('admin.templatesPage.messages.loadDetailFailed'));
        } finally {
            setWorkingTemplateId(null);
        }
    };

    useEffect(() => {
        if (!isCreateMode) return;

        if (!templateIdFromQuery) {
            setForm(EMPTY_TEMPLATE_FORM);
            setEditorTab('basic');
            setQuickPreview(false);
            return;
        }

        handleEdit(templateIdFromQuery);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCreateMode, templateIdFromQuery]);

    const handleOpenPreview = async (id) => {
        setWorkingTemplateId(id);
        setError('');

        try {
            const detail = await loadTemplateById(id);
            setModalPreview({
                open: true,
                title: detail.TenTemplate || t('admin.templatesPage.preview.defaultTitle'),
                html: stripAvatarOverlayFromHtml(detail.HtmlContent || '')
            });
        } catch (err) {
            setError(err?.message || t('admin.templatesPage.messages.openPreviewFailed'));
        } finally {
            setWorkingTemplateId(null);
        }
    };

    const handleDelete = async (template) => {
        const templateName = String(template?.TenTemplate || '').trim();
        const confirmMessage = t('admin.templatesPage.confirm.deleteMessage', { name: templateName || '-' });
        if (typeof requestConfirm !== 'function') return;

        const approved = await requestConfirm({
            title: t('admin.templatesPage.confirm.deleteTitle'),
            message: confirmMessage,
            confirmText: t('admin.templatesPage.confirm.deleteButton')
        });

        if (!approved) return;

        setWorkingTemplateId(template.MaTemplateCV);
        setError('');
        setMessage('');

        try {
            await fetchJson(`${endpoint}/${template.MaTemplateCV}`, {
                method: 'DELETE',
                headers: authHeaders
            });

            if (Number(form.MaTemplateCV) === Number(template.MaTemplateCV)) {
                resetEditor();
            }

            setMessage(t('admin.templatesPage.messages.deleteSuccess'));
            await loadTemplates(searchText, listRange);
        } catch (err) {
            setError(err?.message || t('admin.templatesPage.messages.deleteFailed'));
        } finally {
            setWorkingTemplateId(null);
        }
    };

    const handleFormChange = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value
        }));
    };

    useEffect(() => {
        if (!isCreateMode) return;
        const generatedSlug = slugify(form.TenTemplate || '');
        setForm((prev) => {
            if (prev.Slug === generatedSlug) return prev;
            return {
                ...prev,
                Slug: generatedSlug
            };
        });
    }, [form.TenTemplate, isCreateMode]);

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        const nextSearch = searchInput.trim();
        const nextRange = { from: 1, to: TEMPLATE_PAGE_SIZE };
        setSearchText(nextSearch);
        setListRange(nextRange);
        await loadTemplates(nextSearch, nextRange);
    };

    const handleClearSearch = async () => {
        const nextRange = { from: 1, to: TEMPLATE_PAGE_SIZE };
        setSearchInput('');
        setSearchText('');
        setListRange(nextRange);
        await loadTemplates('', nextRange);
    };

    const handleListRangeChange = async (nextFrom, nextTo) => {
        const nextRange = {
            from: Math.max(1, Number(nextFrom) || 1),
            to: Math.max(1, Number(nextTo) || TEMPLATE_PAGE_SIZE)
        };
        setListRange(nextRange);
        await loadTemplates(searchText, nextRange);
    };

    const handlePickThumbnail = () => {
        const input = document.getElementById('admin-template-thumbnail-input');
        if (input) input.click();
    };

    const handleThumbnailSelected = async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        if (!String(file.type || '').startsWith('image/')) {
            setError(t('admin.templatesPage.messages.thumbnailImageOnly'));
            setThumbnailInputKey((prev) => prev + 1);
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setError(t('admin.templatesPage.messages.thumbnailSizeLimit'));
            setThumbnailInputKey((prev) => prev + 1);
            return;
        }

        if (!authAuthorization) {
            setError(t('admin.templatesPage.messages.missingAuthToken'));
            setThumbnailInputKey((prev) => prev + 1);
            return;
        }

        setUploadingThumbnail(true);
        setError('');

        try {
            const body = new FormData();
            body.append('thumbnail', file);

            const res = await fetch(`${endpoint}/upload-thumbnail`, {
                method: 'POST',
                headers: {
                    Authorization: authAuthorization
                },
                body
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || t('admin.templatesPage.messages.thumbnailUploadFailed'));
            }

            const nextUrl = String(data?.thumbnailUrl || data?.thumbnailAbsoluteUrl || '').trim();
            if (!nextUrl) {
                throw new Error(t('admin.templatesPage.messages.thumbnailUrlInvalid'));
            }

            setForm((prev) => ({
                ...prev,
                ThumbnailUrl: nextUrl
            }));
            setMessage(t('admin.templatesPage.messages.thumbnailUploadSuccess'));
        } catch (err) {
            setError(err?.message || t('admin.templatesPage.messages.thumbnailUploadFailed'));
        } finally {
            setUploadingThumbnail(false);
            setThumbnailInputKey((prev) => prev + 1);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');

        try {
            const payload = {
                name: String(form.TenTemplate || '').trim(),
                slug: slugify(form.Slug || form.TenTemplate),
                description: String(form.MoTa || '').trim(),
                thumbnailUrl: String(form.ThumbnailUrl || '').trim(),
                style: normalizeTemplateStyle(form.PhongCachCV),
                htmlContent: stripAvatarOverlayFromHtml(String(form.HtmlContent || '')),
                status: Number(form.TrangThai) === 0 ? 0 : 1
            };

            if (!payload.name) {
                throw new Error(t('admin.templatesPage.messages.nameRequired'));
            }
            if (!payload.slug) {
                throw new Error(t('admin.templatesPage.messages.slugInvalid'));
            }
            if (!payload.htmlContent.trim()) {
                throw new Error(t('admin.templatesPage.messages.htmlRequired'));
            }

            const isEditing = !!form.MaTemplateCV;
            const url = isEditing ? `${endpoint}/${form.MaTemplateCV}` : endpoint;
            const method = isEditing ? 'PATCH' : 'POST';

            const data = await fetchJson(url, {
                method,
                headers: {
                    ...authHeaders,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const savedTemplate = normalizeTemplate(data.template || {});
            setEditorTab('basic');
            setQuickPreview(false);

            if (isEditing) {
                setForm(savedTemplate);
                showSuccessToast(t('admin.templatesPage.messages.updateSuccess'));
            } else {
                setForm(EMPTY_TEMPLATE_FORM);
                setThumbnailInputKey((prev) => prev + 1);
                showSuccessToast(t('admin.templatesPage.messages.createSuccess'));
            }

            if (isListMode) {
                await loadTemplates(searchText, listRange);
            }
        } catch (err) {
            setError(err?.message || t('admin.templatesPage.messages.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="row g-4 admin-template-section">
            {isListMode && (
                <div className="col-12 admin-template-pane">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">
                                <i className="bi bi-collection me-2"></i>
                                {t('admin.templatesPage.list.title')}
                            </h5>
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => goToCreatePage()}>
                                <i className="bi bi-plus-lg me-1"></i>
                                {t('admin.templatesPage.list.createButton')}
                            </button>
                        </div>

                        <div className="card-body pt-0">
                            {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
                            {message && <div className="alert alert-success mt-3 mb-0">{message}</div>}

                            <form className="admin-template-search mt-3" onSubmit={handleSearchSubmit}>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder={t('admin.templatesPage.list.searchPlaceholder')}
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                />
                                <button type="submit" className="btn btn-outline-primary">{t('common.search')}</button>
                                {(searchText || searchInput) && (
                                    <button type="button" className="btn btn-outline-secondary" onClick={handleClearSearch}>{t('common.clearFilters')}</button>
                                )}
                            </form>

                            <div className="table-responsive admin-template-table-wrap mt-3">
                                <table className="table table-hover align-middle mb-0">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 72 }}>ID</th>
                                            <th>{t('admin.templatesPage.list.columns.templateName')}</th>
                                            <th style={{ width: 180 }}>Slug</th>
                                            <th style={{ width: 190 }}>{t('admin.templatesPage.list.columns.updatedAt')}</th>
                                            <th style={{ width: 230 }}>{t('admin.templatesPage.list.columns.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {templates.map((template, index) => (
                                            <tr key={template.MaTemplateCV}>
                                                <td>{listPagination.from > 0 ? listPagination.from + index : index + 1}</td>
                                                <td>
                                                    <div className="fw-semibold text-truncate" title={template.TenTemplate}>{template.TenTemplate}</div>
                                                    <div className="text-muted small text-truncate" title={template.MoTa || ''}>{template.MoTa || t('admin.templatesPage.list.noDescription')}</div>
                                                </td>
                                                <td><code>{template.Slug}</code></td>
                                                <td className="small text-muted">{formatDate(template.NgayCapNhat || template.NgayTao, currentLocale)}</td>
                                                <td>
                                                    <div className="d-flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-primary admin-action-icon-btn"
                                                            disabled={workingTemplateId === template.MaTemplateCV}
                                                            onClick={() => goToCreatePage(template.MaTemplateCV)}
                                                            title={t('admin.templatesPage.list.actions.edit')}
                                                            aria-label={t('admin.templatesPage.list.actions.edit')}
                                                        >
                                                            <PencilLine size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-info admin-action-icon-btn"
                                                            disabled={workingTemplateId === template.MaTemplateCV}
                                                            onClick={() => handleOpenPreview(template.MaTemplateCV)}
                                                            title={t('admin.templatesPage.list.actions.preview')}
                                                            aria-label={t('admin.templatesPage.list.actions.preview')}
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger admin-action-icon-btn"
                                                            disabled={workingTemplateId === template.MaTemplateCV}
                                                            onClick={() => handleDelete(template)}
                                                            title={t('admin.templatesPage.list.actions.delete')}
                                                            aria-label={t('admin.templatesPage.list.actions.delete')}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {templates.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan={5} className="text-center text-muted py-4">{t('admin.templatesPage.list.empty')}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {listPagination.total > 0 ? (
                                <div className="d-flex justify-content-end mt-3">
                                    <SmartPagination
                                        from={listPagination.from}
                                        to={listPagination.to}
                                        pageSize={Math.max(1, Number(listPagination.limit) || TEMPLATE_PAGE_SIZE)}
                                        perPage={Math.max(1, Number(listPagination.limit) || TEMPLATE_PAGE_SIZE)}
                                        totalItems={listPagination.total}
                                        loading={loading}
                                        onRangeChange={handleListRangeChange}
                                    />
                                </div>
                            ) : null}

                            {loading && <div className="alert alert-info mt-3 mb-0">{t('admin.templatesPage.list.loading')}</div>}
                        </div>
                    </div>
                </div>
            )}

            {isCreateMode && (
                <div className="col-12 admin-template-pane">
                    <div className="card border-0 shadow-sm h-100 admin-template-create-card">
                        <div className="card-header border-0 py-3 d-flex justify-content-start align-items-center flex-wrap gap-3 admin-template-create-header">
                            <div className="admin-template-create-header-copy">
                                <h5 className="mb-0">
                                    <i className="bi bi-code-square me-2"></i>
                                    {form.MaTemplateCV
                                        ? t('admin.templatesPage.create.editTitle', { id: form.MaTemplateCV })
                                        : t('admin.templatesPage.create.newTitle')}
                                </h5>
                            </div>
                            <button type="button" className="btn btn-sm btn-outline-secondary ms-auto" onClick={() => navigate('/admin/templates')}>
                                {t('admin.templatesPage.create.allTemplatesButton')}
                            </button>
                        </div>

                        <div className="card-body admin-template-create-body">
                            {!!templateIdFromQuery && workingTemplateId === templateIdFromQuery && (
                                <div className="alert alert-info">{t('admin.templatesPage.create.loadingDetail')}</div>
                            )}
                            {error && <div className="alert alert-danger">{error}</div>}
                            {message && <div className="alert alert-success">{message}</div>}

                            <form onSubmit={handleSubmit} className="admin-template-editor-form">
                                <ul className="nav nav-tabs admin-template-tabs mb-3" role="tablist">
                                    <li className="nav-item" role="presentation">
                                        <button type="button" className={`nav-link ${editorTab === 'basic' ? 'active' : ''}`} onClick={() => setEditorTab('basic')}>
                                            {t('admin.templatesPage.create.tabs.basic')}
                                        </button>
                                    </li>
                                    <li className="nav-item" role="presentation">
                                        <button type="button" className={`nav-link ${editorTab === 'html' ? 'active' : ''}`} onClick={() => setEditorTab('html')}>
                                            {t('admin.templatesPage.create.tabs.html')}
                                        </button>
                                    </li>
                                    <li className="nav-item" role="presentation">
                                        <button type="button" className={`nav-link ${editorTab === 'preview' ? 'active' : ''}`} onClick={() => setEditorTab('preview')}>
                                            {t('admin.templatesPage.create.tabs.preview')}
                                        </button>
                                    </li>
                                </ul>

                                {editorTab === 'basic' && (
                                    <div className="admin-template-basic-grid">
                                        <div>
                                            <label className="form-label">{t('admin.templatesPage.create.fields.name')} *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.TenTemplate}
                                                onChange={(e) => handleFormChange('TenTemplate', e.target.value)}
                                                placeholder={t('admin.templatesPage.create.placeholders.name')}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="form-label">{t('admin.templatesPage.create.fields.slug')} *</label>
                                            <div className="input-group">
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={form.Slug}
                                                    placeholder={t('admin.templatesPage.create.placeholders.slug')}
                                                    readOnly
                                                    required
                                                />
                                            </div>
                                            <small className="text-muted">{t('admin.templatesPage.create.slugHint')}</small>
                                        </div>

                                        <div>
                                            <label className="form-label">{t('admin.templatesPage.create.fields.status')}</label>
                                            <select
                                                className="form-select"
                                                value={Number(form.TrangThai) === 0 ? 0 : 1}
                                                onChange={(e) => handleFormChange('TrangThai', Number(e.target.value))}
                                            >
                                                <option value={1}>{t('admin.templatesPage.create.status.active')}</option>
                                                <option value={0}>{t('admin.templatesPage.create.status.inactive')}</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="form-label">{t('admin.templatesPage.create.fields.style')}</label>
                                            <select
                                                className="form-select"
                                                value={normalizeTemplateStyle(form.PhongCachCV)}
                                                onChange={(e) => handleFormChange('PhongCachCV', normalizeTemplateStyle(e.target.value))}
                                            >
                                                {translatedStyleOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="admin-template-basic-grid-full">
                                            <label className="form-label">{t('admin.templatesPage.create.fields.description')}</label>
                                            <textarea
                                                className="form-control"
                                                rows={4}
                                                value={form.MoTa}
                                                onChange={(e) => handleFormChange('MoTa', e.target.value)}
                                                placeholder={t('admin.templatesPage.create.placeholders.description')}
                                            />
                                        </div>

                                        <div className="admin-template-thumbnail-field admin-template-basic-grid-full">
                                            <label className="form-label">{t('admin.templatesPage.create.fields.thumbnailUrl')}</label>
                                            <input
                                                type="url"
                                                className="form-control"
                                                value={form.ThumbnailUrl}
                                                onChange={(e) => handleFormChange('ThumbnailUrl', e.target.value)}
                                            />

                                            <div className="admin-template-thumbnail-actions mt-2">
                                                <input
                                                    key={thumbnailInputKey}
                                                    id="admin-template-thumbnail-input"
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={handleThumbnailSelected}
                                                />

                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={handlePickThumbnail}
                                                    disabled={saving || uploadingThumbnail}
                                                >
                                                    <i className="bi bi-upload me-2"></i>
                                                    {uploadingThumbnail
                                                        ? t('admin.templatesPage.create.uploadingImage')
                                                        : t('admin.templatesPage.create.uploadImage')}
                                                </button>

                                                {form.ThumbnailUrl && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-secondary"
                                                        disabled={saving || uploadingThumbnail}
                                                        onClick={() => handleFormChange('ThumbnailUrl', '')}
                                                    >
                                                        {t('admin.templatesPage.create.removeThumbnail')}
                                                    </button>
                                                )}
                                            </div>

                                            <small className="text-muted d-block mt-2">{t('admin.templatesPage.create.thumbnailHint')}</small>

                                            {form.ThumbnailUrl ? (
                                                <div className="admin-template-thumbnail-preview mt-3">
                                                    <img src={form.ThumbnailUrl} alt={t('admin.templatesPage.preview.thumbnailAlt')} />
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                )}

                                {editorTab === 'html' && (
                                    <div>
                                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                                            <label className="form-label mb-0">{t('admin.templatesPage.create.fields.htmlContent')} *</label>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => setQuickPreview((prev) => !prev)}
                                            >
                                                {quickPreview
                                                    ? t('admin.templatesPage.create.editCode')
                                                    : t('admin.templatesPage.create.quickPreview')}
                                            </button>
                                        </div>

                                        {!quickPreview ? (
                                            <textarea
                                                className="form-control admin-template-code-input"
                                                value={form.HtmlContent}
                                                onChange={(e) => handleFormChange('HtmlContent', e.target.value)}
                                                placeholder="<!doctype html>..."
                                                required
                                            />
                                        ) : (
                                            <div className="admin-template-preview-pane">
                                                {sanitizedPreviewHtml.trim() ? (
                                                    <iframe
                                                        title={t('admin.templatesPage.preview.quickTitle')}
                                                        srcDoc={sanitizedPreviewHtml}
                                                        className="admin-template-preview-frame"
                                                        sandbox="allow-scripts"
                                                    />
                                                ) : (
                                                    <div className="admin-template-preview-empty">{t('admin.templatesPage.preview.emptyQuick')}</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {editorTab === 'preview' && (
                                    <div className="admin-template-preview-pane">
                                        {sanitizedPreviewHtml.trim() ? (
                                            <iframe
                                                title={t('admin.templatesPage.preview.tabTitle')}
                                                srcDoc={sanitizedPreviewHtml}
                                                className="admin-template-preview-frame preview-tab"
                                                sandbox="allow-scripts"
                                            />
                                        ) : (
                                            <div className="admin-template-preview-empty">{t('admin.templatesPage.preview.emptyTab')}</div>
                                        )}
                                    </div>
                                )}

                                <div className="admin-template-form-actions mt-4">
                                    <button type="submit" className="btn btn-primary admin-template-submit-btn" disabled={saving}>
                                        {saving
                                            ? (form.MaTemplateCV
                                                ? t('admin.templatesPage.create.savingUpdating')
                                                : t('admin.templatesPage.create.savingCreating'))
                                            : (form.MaTemplateCV
                                                ? t('admin.templatesPage.create.submitUpdate')
                                                : t('admin.templatesPage.create.submitCreate'))}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {successToast.open && (
                <div className="admin-template-success-toast" role="status" aria-live="polite">
                    <div className="admin-template-success-toast-inner">
                        <i className="bi bi-check-circle-fill" aria-hidden="true"></i>
                        <span>{successToast.text}</span>
                    </div>
                </div>
            )}

            {modalPreview.open && (
                <div className="admin-template-preview-backdrop" role="dialog" aria-modal="true">
                    <div className="admin-template-preview-dialog card border-0 shadow-lg">
                        <div className="card-header bg-white d-flex justify-content-between align-items-center">
                            <h6 className="mb-0 text-truncate">{t('admin.templatesPage.preview.modalTitle')}: {modalPreview.title}</h6>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setModalPreview({ open: false, title: '', html: '' })}>
                                {t('common.close')}
                            </button>
                        </div>
                        <div className="card-body p-0">
                            {modalPreview.html.trim() ? (
                                <iframe
                                    title={t('admin.templatesPage.preview.modalFrameTitle')}
                                    srcDoc={modalPreview.html}
                                    className="admin-template-preview-frame modal-frame"
                                    sandbox="allow-scripts"
                                />
                            ) : (
                                <div className="admin-template-preview-empty">{t('admin.templatesPage.preview.emptyModal')}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTemplateManager;
