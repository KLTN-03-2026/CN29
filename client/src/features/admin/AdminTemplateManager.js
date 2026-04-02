import React, { useEffect, useMemo, useState } from 'react';
import './AdminTemplateManager.css';

const EMPTY_TEMPLATE_FORM = {
    MaTemplateCV: null,
    TenTemplate: '',
    Slug: '',
    MoTa: '',
    HtmlContent: '',
    TrangThai: 1,
    NgayTao: '',
    NgayCapNhat: ''
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
    HtmlContent: String(template?.HtmlContent || template?.htmlContent || ''),
    TrangThai: Number(template?.TrangThai ?? template?.status ?? 1) === 0 ? 0 : 1,
    NgayTao: String(template?.NgayTao || template?.createdAt || ''),
    NgayCapNhat: String(template?.NgayCapNhat || template?.updatedAt || '')
});

const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('vi-VN');
};

const AdminTemplateManager = ({ API_BASE, authHeaders, requestConfirm }) => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [workingTemplateId, setWorkingTemplateId] = useState(null);

    const [searchInput, setSearchInput] = useState('');
    const [searchText, setSearchText] = useState('');

    const [editorTab, setEditorTab] = useState('basic');
    const [quickPreview, setQuickPreview] = useState(false);
    const [form, setForm] = useState(EMPTY_TEMPLATE_FORM);

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const [modalPreview, setModalPreview] = useState({
        open: false,
        title: '',
        html: ''
    });

    const endpoint = useMemo(() => `${API_BASE}/api/admin/templates`, [API_BASE]);

    const fetchJson = async (url, options = {}) => {
        const res = await fetch(url, options);
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
            throw new Error(data?.error || 'Không thể xử lý yêu cầu');
        }
        return data;
    };

    const loadTemplates = async (nextSearch = searchText) => {
        setLoading(true);
        setError('');

        try {
            const query = new URLSearchParams({ limit: '100', offset: '0' });
            if (nextSearch) query.set('search', nextSearch);

            const data = await fetchJson(`${endpoint}?${query.toString()}`, {
                headers: authHeaders
            });

            const rows = Array.isArray(data?.templates) ? data.templates : [];
            setTemplates(rows.map(normalizeTemplate));
        } catch (err) {
            setError(err?.message || 'Không tải được danh sách template');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpoint]);

    const resetEditor = () => {
        setForm(EMPTY_TEMPLATE_FORM);
        setEditorTab('basic');
        setQuickPreview(false);
        setError('');
        setMessage('');
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
            setError(err?.message || 'Không tải được chi tiết template');
        } finally {
            setWorkingTemplateId(null);
        }
    };

    const handleOpenPreview = async (id) => {
        setWorkingTemplateId(id);
        setError('');

        try {
            const detail = await loadTemplateById(id);
            setModalPreview({
                open: true,
                title: detail.TenTemplate || 'Preview template',
                html: detail.HtmlContent || ''
            });
        } catch (err) {
            setError(err?.message || 'Không mở được preview');
        } finally {
            setWorkingTemplateId(null);
        }
    };

    const handleDelete = async (template) => {
        const templateName = template?.TenTemplate || '';
        const confirmMessage = `Bạn có chắc muốn xóa template "${templateName}"?`;

        const approved = requestConfirm
            ? await requestConfirm({
                title: 'Xác nhận xóa template',
                message: confirmMessage,
                confirmText: 'Xóa'
            })
            : window.confirm(confirmMessage);

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

            setMessage('Đã xóa template thành công.');
            await loadTemplates(searchText);
        } catch (err) {
            setError(err?.message || 'Không xóa được template');
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

    const handleGenerateSlug = () => {
        setForm((prev) => ({
            ...prev,
            Slug: slugify(prev.TenTemplate)
        }));
    };

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        const nextSearch = searchInput.trim();
        setSearchText(nextSearch);
        await loadTemplates(nextSearch);
    };

    const handleClearSearch = async () => {
        setSearchInput('');
        setSearchText('');
        await loadTemplates('');
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
                htmlContent: String(form.HtmlContent || ''),
                status: Number(form.TrangThai) === 0 ? 0 : 1
            };

            if (!payload.name) {
                throw new Error('Tên template là bắt buộc.');
            }
            if (!payload.slug) {
                throw new Error('Slug không hợp lệ.');
            }
            if (!payload.htmlContent.trim()) {
                throw new Error('HTML content là bắt buộc.');
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
            setForm(savedTemplate);
            setMessage(isEditing ? 'Đã cập nhật template thành công.' : 'Đã tạo template mới thành công.');
            setEditorTab('basic');
            setQuickPreview(false);

            await loadTemplates(searchText);
        } catch (err) {
            setError(err?.message || 'Không lưu được template');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="row g-4 admin-template-section">
            <div className="col-12 col-xl-5">
                <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">
                            <i className="bi bi-collection me-2"></i>
                            Danh sách template CV
                        </h5>
                        <button type="button" className="btn btn-sm btn-primary" onClick={resetEditor}>
                            <i className="bi bi-plus-lg me-1"></i>
                            Tạo mới
                        </button>
                    </div>

                    <div className="card-body pt-0">
                        <form className="admin-template-search" onSubmit={handleSearchSubmit}>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Tìm theo tên hoặc slug..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                            <button type="submit" className="btn btn-outline-primary">Tìm</button>
                            {(searchText || searchInput) && (
                                <button type="button" className="btn btn-outline-secondary" onClick={handleClearSearch}>Xóa lọc</button>
                            )}
                        </form>

                        <div className="table-responsive admin-template-table-wrap mt-3">
                            <table className="table table-hover align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th style={{ width: 72 }}>ID</th>
                                        <th>Tên template</th>
                                        <th style={{ width: 140 }}>Slug</th>
                                        <th style={{ width: 160 }}>Cập nhật</th>
                                        <th style={{ width: 200 }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {templates.map((template) => (
                                        <tr key={template.MaTemplateCV}>
                                            <td>{template.MaTemplateCV}</td>
                                            <td>
                                                <div className="fw-semibold text-truncate" title={template.TenTemplate}>{template.TenTemplate}</div>
                                                <div className="text-muted small text-truncate" title={template.MoTa || ''}>{template.MoTa || 'Không có mô tả'}</div>
                                            </td>
                                            <td><code>{template.Slug}</code></td>
                                            <td className="small text-muted">{formatDate(template.NgayCapNhat || template.NgayTao)}</td>
                                            <td>
                                                <div className="d-flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary"
                                                        disabled={workingTemplateId === template.MaTemplateCV}
                                                        onClick={() => handleEdit(template.MaTemplateCV)}
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-info"
                                                        disabled={workingTemplateId === template.MaTemplateCV}
                                                        onClick={() => handleOpenPreview(template.MaTemplateCV)}
                                                    >
                                                        Preview
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger"
                                                        disabled={workingTemplateId === template.MaTemplateCV}
                                                        onClick={() => handleDelete(template)}
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {templates.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={5} className="text-center text-muted py-4">Chưa có template nào</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {loading && <div className="alert alert-info mt-3 mb-0">Đang tải danh sách template...</div>}
                    </div>
                </div>
            </div>

            <div className="col-12 col-xl-7">
                <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-white border-0 py-3">
                        <h5 className="mb-0">
                            <i className="bi bi-code-square me-2"></i>
                            {form.MaTemplateCV ? `Chỉnh sửa template #${form.MaTemplateCV}` : 'Tạo template CV mới'}
                        </h5>
                    </div>

                    <div className="card-body">
                        {error && <div className="alert alert-danger">{error}</div>}
                        {message && <div className="alert alert-success">{message}</div>}

                        <form onSubmit={handleSubmit} className="admin-template-editor-form">
                            <ul className="nav nav-tabs admin-template-tabs mb-3" role="tablist">
                                <li className="nav-item" role="presentation">
                                    <button type="button" className={`nav-link ${editorTab === 'basic' ? 'active' : ''}`} onClick={() => setEditorTab('basic')}>
                                        Thông tin cơ bản
                                    </button>
                                </li>
                                <li className="nav-item" role="presentation">
                                    <button type="button" className={`nav-link ${editorTab === 'html' ? 'active' : ''}`} onClick={() => setEditorTab('html')}>
                                        HTML & Design
                                    </button>
                                </li>
                                <li className="nav-item" role="presentation">
                                    <button type="button" className={`nav-link ${editorTab === 'preview' ? 'active' : ''}`} onClick={() => setEditorTab('preview')}>
                                        Xem trước
                                    </button>
                                </li>
                            </ul>

                            {editorTab === 'basic' && (
                                <div className="admin-template-basic-grid">
                                    <div>
                                        <label className="form-label">Tên template *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={form.TenTemplate}
                                            onChange={(e) => handleFormChange('TenTemplate', e.target.value)}
                                            placeholder="Ví dụ: CV Chuyên nghiệp xanh navy"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Slug (URL) *</label>
                                        <div className="input-group">
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.Slug}
                                                onChange={(e) => handleFormChange('Slug', e.target.value)}
                                                placeholder="cv-chuyen-nghiep-xanh-navy"
                                                required
                                            />
                                            <button type="button" className="btn btn-outline-secondary" onClick={handleGenerateSlug}>
                                                Tự động tạo
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="form-label">Trạng thái</label>
                                        <select
                                            className="form-select"
                                            value={Number(form.TrangThai) === 0 ? 0 : 1}
                                            onChange={(e) => handleFormChange('TrangThai', Number(e.target.value))}
                                        >
                                            <option value={1}>Hoạt động</option>
                                            <option value={0}>Tạm tắt</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="form-label">Mô tả</label>
                                        <textarea
                                            className="form-control"
                                            rows={4}
                                            value={form.MoTa}
                                            onChange={(e) => handleFormChange('MoTa', e.target.value)}
                                            placeholder="Mô tả ngắn về template CV"
                                        />
                                    </div>
                                </div>
                            )}

                            {editorTab === 'html' && (
                                <div>
                                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                                        <label className="form-label mb-0">HTML Content *</label>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => setQuickPreview((prev) => !prev)}
                                        >
                                            {quickPreview ? 'Sửa code' : 'Xem Preview nhanh'}
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
                                            {form.HtmlContent.trim() ? (
                                                <iframe
                                                    title="Quick Preview"
                                                    srcDoc={form.HtmlContent}
                                                    className="admin-template-preview-frame"
                                                    sandbox="allow-scripts"
                                                />
                                            ) : (
                                                <div className="admin-template-preview-empty">Nhập HTML content để xem preview.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {editorTab === 'preview' && (
                                <div className="admin-template-preview-pane">
                                    {form.HtmlContent.trim() ? (
                                        <iframe
                                            title="Template Preview"
                                            srcDoc={form.HtmlContent}
                                            className="admin-template-preview-frame preview-tab"
                                            sandbox="allow-scripts"
                                        />
                                    ) : (
                                        <div className="admin-template-preview-empty">Chưa có nội dung HTML để xem trước.</div>
                                    )}
                                </div>
                            )}

                            <div className="d-flex justify-content-end gap-2 mt-4">
                                <button type="button" className="btn btn-outline-secondary" onClick={resetEditor} disabled={saving}>
                                    Làm mới form
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Đang lưu...' : (form.MaTemplateCV ? 'Cập nhật template' : 'Lưu template')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {modalPreview.open && (
                <div className="admin-template-preview-backdrop" role="dialog" aria-modal="true">
                    <div className="admin-template-preview-dialog card border-0 shadow-lg">
                        <div className="card-header bg-white d-flex justify-content-between align-items-center">
                            <h6 className="mb-0 text-truncate">Preview: {modalPreview.title}</h6>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setModalPreview({ open: false, title: '', html: '' })}>
                                Đóng
                            </button>
                        </div>
                        <div className="card-body p-0">
                            {modalPreview.html.trim() ? (
                                <iframe
                                    title="Template Modal Preview"
                                    srcDoc={modalPreview.html}
                                    className="admin-template-preview-frame modal-frame"
                                    sandbox="allow-scripts"
                                />
                            ) : (
                                <div className="admin-template-preview-empty">Template này chưa có nội dung HTML.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTemplateManager;
