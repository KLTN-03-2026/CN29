import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, PencilLine, Save, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import InstallAppPanel from '../../../components/pwa/InstallAppPanel';
import { API_BASE as CLIENT_API_BASE } from '../../../config/apiBase';

const AVATAR_FALLBACK = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

const readStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
        return {};
    }
};

const syncLocalUserSnapshot = (overrides = {}) => {
    const current = readStoredUser();
    const next = {
        ...current,
        ...overrides
    };

    try {
        localStorage.setItem('user', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('jobfinder:user-updated', { detail: next }));
    } catch {
        // Ignore localStorage sync errors.
    }
};

const normalizeAvatarUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && raw.startsWith('http://')) {
        return `https://${raw.slice(7)}`;
    }
    return raw;
};

const withAvatarVersion = (url, version) => {
    const raw = normalizeAvatarUrl(url);
    if (!raw || raw.startsWith('blob:')) return raw;

    const versionNumber = Number(version || 0);
    if (!Number.isFinite(versionNumber) || versionNumber <= 0) {
        return raw;
    }

    const separator = raw.includes('?') ? '&' : '?';
    return `${raw}${separator}v=${versionNumber}`;
};

const formatDateTime = (value, locale = 'vi-VN', fallback = '-') => {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleString(locale);
};

const firstNonEmpty = (...values) => {
    for (const value of values) {
        if (value == null) continue;
        const normalized = String(value).trim();
        if (normalized) return normalized;
    }
    return '';
};

const resolveRoleLabel = (explicitRoleLabel, user = {}, t) => {
    const preferred = String(explicitRoleLabel || '').trim();
    if (preferred) return preferred;

    const fallbackRole = firstNonEmpty(user?.VaiTro, user?.LoaiNguoiDung, user?.role);
    const normalizedFallback = fallbackRole.toLowerCase();

    if (normalizedFallback.includes('siêu') || normalizedFallback.includes('sieu') || normalizedFallback.includes('super')) {
        return t('admin.profilePage.roles.superAdmin');
    }

    if (fallbackRole) return fallbackRole;
    return t('admin.profilePage.roles.admin');
};

const resolveUserId = (user = {}) => {
    return user?.id || user?.MaNguoiDung || user?.userId || user?.userID || null;
};

const buildInitialForm = (user = {}) => ({
    fullName: firstNonEmpty(user?.full_name, user?.HoTen, user?.name),
    email: firstNonEmpty(user?.email, user?.Email),
    phone: firstNonEmpty(user?.phone, user?.SoDienThoai),
    city: firstNonEmpty(user?.city, user?.ThanhPho),
    address: firstNonEmpty(user?.address, user?.DiaChi),
    position: firstNonEmpty(user?.position, user?.ChucDanh),
    personalLink: firstNonEmpty(user?.personalLink, user?.LinkCaNhan),
    avatarUrl: normalizeAvatarUrl(user?.avatar || user?.avatarAbsoluteUrl || user?.AnhDaiDien || user?.avatarUrl || ''),
    createdAt: firstNonEmpty(user?.createdAt, user?.NgayTao, user?.NguoiDungNgayTao),
    updatedAt: firstNonEmpty(user?.updatedAt, user?.NgayCapNhat, user?.NguoiDungNgayCapNhat)
});

const AdminProfilePage = ({ user, roleLabel, greetingName }) => {
    const { t, i18n } = useTranslation();
    const API_BASE = CLIENT_API_BASE;
    const userId = useMemo(() => resolveUserId(user), [user]);
    const avatarInputRef = useRef(null);
    const avatarObjectUrlRef = useRef('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [form, setForm] = useState(() => buildInitialForm(user));
    const [baselineForm, setBaselineForm] = useState(() => buildInitialForm(user));
    const [avatarPreview, setAvatarPreview] = useState(() => normalizeAvatarUrl(user?.avatar || user?.avatarAbsoluteUrl || user?.AnhDaiDien || user?.avatarUrl || '') || AVATAR_FALLBACK);
    const [baselineAvatar, setBaselineAvatar] = useState(() => normalizeAvatarUrl(user?.avatar || user?.avatarAbsoluteUrl || user?.AnhDaiDien || user?.avatarUrl || '') || AVATAR_FALLBACK);
    const [avatarFile, setAvatarFile] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const locale = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase().startsWith('en')
        ? 'en-US'
        : 'vi-VN';

    useEffect(() => () => {
        if (avatarObjectUrlRef.current) {
            URL.revokeObjectURL(avatarObjectUrlRef.current);
            avatarObjectUrlRef.current = '';
        }
    }, []);

    useEffect(() => {
        if (!userId) {
            setError(t('admin.profilePage.messages.missingAccount'));
            setLoading(false);
            return;
        }

        let cancelled = false;

        const loadProfile = async () => {
            setLoading(true);
            setError('');
            setMessage('');

            try {
                const response = await fetch(`${API_BASE}/users/profile/${userId}`);
                const data = await response.json().catch(() => ({}));

                if (!response.ok || !data?.success) {
                    throw new Error(data?.error || t('admin.profilePage.messages.loadFailed'));
                }

                if (cancelled) return;

                const profile = data.profile || {};
                const fallbackForm = buildInitialForm(user);
                const normalizedAvatar = normalizeAvatarUrl(profile.avatarAbsoluteUrl || profile.avatarUrl || '');
                const nextForm = {
                    fullName: firstNonEmpty(profile.fullName, profile.HoTen, fallbackForm.fullName),
                    email: firstNonEmpty(profile.email, profile.Email, fallbackForm.email),
                    phone: firstNonEmpty(profile.phone, profile.SoDienThoai, fallbackForm.phone),
                    city: firstNonEmpty(profile.city, profile.ThanhPho, fallbackForm.city),
                    address: firstNonEmpty(profile.address, profile.DiaChi, fallbackForm.address),
                    position: firstNonEmpty(profile.position, profile.ChucDanh, fallbackForm.position),
                    personalLink: firstNonEmpty(profile.personalLink, profile.LinkCaNhan, fallbackForm.personalLink),
                    avatarUrl: normalizedAvatar || fallbackForm.avatarUrl,
                    createdAt: firstNonEmpty(profile.createdAt, profile.NgayTao, fallbackForm.createdAt),
                    updatedAt: firstNonEmpty(profile.updatedAt, profile.NgayCapNhat, fallbackForm.updatedAt)
                };

                setForm(nextForm);
                setBaselineForm(nextForm);
                setAvatarPreview(normalizedAvatar || AVATAR_FALLBACK);
                setBaselineAvatar(normalizedAvatar || AVATAR_FALLBACK);
                setIsEditing(false);
                setAvatarFile(null);

                const storedUser = readStoredUser();
                const fallbackName = storedUser?.name || storedUser?.HoTen || '';
                const fallbackAvatar = normalizeAvatarUrl(
                    storedUser?.avatar
                    || storedUser?.avatarAbsoluteUrl
                    || storedUser?.AnhDaiDien
                    || storedUser?.avatarUrl
                    || ''
                );

                syncLocalUserSnapshot({
                    name: nextForm.fullName || fallbackName,
                    HoTen: nextForm.fullName || fallbackName,
                    avatar: normalizedAvatar || fallbackAvatar,
                    AnhDaiDien: normalizedAvatar || fallbackAvatar,
                    avatarAbsoluteUrl: normalizedAvatar || fallbackAvatar,
                    avatarUrl: normalizedAvatar || fallbackAvatar
                });
            } catch (err) {
                if (!cancelled) {
                    setError(err?.message || t('admin.profilePage.messages.loadFailed'));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadProfile();

        return () => {
            cancelled = true;
        };
    }, [API_BASE, userId, t]);

    const handleFieldChange = (key) => (event) => {
        const value = event.target.value;
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const clearPendingAvatar = (nextAvatarUrl = form.avatarUrl) => {
        if (avatarObjectUrlRef.current) {
            URL.revokeObjectURL(avatarObjectUrlRef.current);
            avatarObjectUrlRef.current = '';
        }
        setAvatarFile(null);
        setAvatarPreview(nextAvatarUrl || AVATAR_FALLBACK);
        if (avatarInputRef.current) {
            avatarInputRef.current.value = '';
        }
    };

    const handleStartEditing = () => {
        setError('');
        setMessage('');
        setIsEditing(true);
    };

    const handleCancelEditing = () => {
        setForm(baselineForm);
        clearPendingAvatar(baselineAvatar);
        setError('');
        setMessage('');
        setIsEditing(false);
    };

    const handleAvatarSelect = (event) => {
        if (!isEditing) {
            setError(t('admin.profilePage.messages.editFirst'));
            return;
        }

        const file = event.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError(t('admin.profilePage.messages.avatarTypeInvalid'));
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError(t('admin.profilePage.messages.avatarTooLarge'));
            return;
        }

        setError('');
        setMessage('');
        setAvatarFile(file);

        if (avatarObjectUrlRef.current) {
            URL.revokeObjectURL(avatarObjectUrlRef.current);
        }
        const objectUrl = URL.createObjectURL(file);
        avatarObjectUrlRef.current = objectUrl;
        setAvatarPreview(objectUrl);
    };

    const handleAvatarUpload = async () => {
        if (!isEditing || !userId || !avatarFile || uploadingAvatar) return;

        setUploadingAvatar(true);
        setError('');
        setMessage('');

        try {
            const formData = new FormData();
            formData.append('avatar', avatarFile);
            formData.append('userId', String(userId));

            const response = await fetch(`${API_BASE}/users/upload-avatar`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                throw new Error(data.error || t('admin.profilePage.messages.avatarUploadFailed'));
            }

            const uploadedAvatar = normalizeAvatarUrl(data.absoluteUrl || data.avatarUrl || '');

            setForm((prev) => ({ ...prev, avatarUrl: uploadedAvatar }));
            setBaselineForm((prev) => ({ ...prev, avatarUrl: uploadedAvatar }));
            setAvatarPreview(uploadedAvatar || AVATAR_FALLBACK);
            setBaselineAvatar(uploadedAvatar || AVATAR_FALLBACK);
            setAvatarFile(null);

            if (avatarInputRef.current) {
                avatarInputRef.current.value = '';
            }
            if (avatarObjectUrlRef.current) {
                URL.revokeObjectURL(avatarObjectUrlRef.current);
                avatarObjectUrlRef.current = '';
            }

            syncLocalUserSnapshot({
                name: form.fullName || user?.name || user?.HoTen || '',
                HoTen: form.fullName || user?.HoTen || user?.name || '',
                avatar: uploadedAvatar,
                AnhDaiDien: uploadedAvatar,
                avatarAbsoluteUrl: uploadedAvatar,
                avatarUrl: uploadedAvatar,
                avatarUpdatedAt: Date.now()
            });

            setMessage(t('admin.profilePage.messages.avatarUploadSuccess'));
        } catch (err) {
            setError(err?.message || t('admin.profilePage.messages.avatarUploadFailed'));
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!isEditing || !userId || saving) return;

        setSaving(true);
        setError('');
        setMessage('');

        try {
            const payload = {
                userId,
                fullName: form.fullName || '',
                phone: form.phone || '',
                city: form.city || '',
                address: form.address || '',
                position: form.position || '',
                personalLink: form.personalLink || '',
                avatar: form.avatarUrl || ''
            };

            const response = await fetch(`${API_BASE}/users/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.error) {
                throw new Error(data.error || t('admin.profilePage.messages.saveFailed'));
            }

            const normalizedAvatar = normalizeAvatarUrl(form.avatarUrl || user?.avatar || user?.AnhDaiDien || '');

            syncLocalUserSnapshot({
                name: form.fullName || user?.name || user?.HoTen || '',
                HoTen: form.fullName || user?.HoTen || user?.name || '',
                avatar: normalizedAvatar,
                AnhDaiDien: normalizedAvatar,
                avatarAbsoluteUrl: normalizedAvatar,
                avatarUrl: normalizedAvatar,
                avatarUpdatedAt: Date.now()
            });

            setBaselineForm(form);
            setBaselineAvatar(normalizedAvatar || AVATAR_FALLBACK);
            setIsEditing(false);
            setMessage(t('admin.profilePage.messages.saveSuccess'));
        } catch (err) {
            setError(err?.message || t('admin.profilePage.messages.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const displayName = form.fullName || greetingName || t('admin.greetingDefault');
    const resolvedAvatar = withAvatarVersion(avatarPreview || form.avatarUrl || AVATAR_FALLBACK, user?.avatarUpdatedAt);
    const resolvedRoleLabel = resolveRoleLabel(roleLabel, user, t);
    const resolvedEmail = firstNonEmpty(form.email, user?.email, user?.Email) || '-';
    const resolvedPhone = firstNonEmpty(form.phone, user?.phone, user?.SoDienThoai) || '-';
    const resolvedCity = firstNonEmpty(form.city, user?.city, user?.ThanhPho) || '-';
    const resolvedAddress = firstNonEmpty(form.address, user?.address, user?.DiaChi) || '-';
    const resolvedCreatedAt = firstNonEmpty(form.createdAt, user?.createdAt, user?.NgayTao, user?.NguoiDungNgayTao);
    const resolvedUpdatedAt = firstNonEmpty(form.updatedAt, user?.updatedAt, user?.NgayCapNhat, user?.NguoiDungNgayCapNhat);

    return (
        <section className="admin-profile-shell">
            <div className="admin-profile-card">
                <div className="admin-profile-avatar-wrap">
                    <img
                        src={resolvedAvatar || AVATAR_FALLBACK}
                        alt={displayName}
                        className="admin-profile-avatar-image"
                        onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = AVATAR_FALLBACK;
                        }}
                    />
                </div>
                <div className="admin-profile-card-copy">
                    <h3>{displayName}</h3>
                    <p>{resolvedRoleLabel}</p>
                    <small>{t('admin.profilePage.avatar.hint')}</small>
                </div>
                <div className="admin-profile-card-actions">
                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="d-none"
                        onChange={handleAvatarSelect}
                    />
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => avatarInputRef.current?.click()} disabled={!isEditing || uploadingAvatar}>
                        <Camera size={14} />
                        <span>{t('admin.profilePage.avatar.selectImage')}</span>
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleAvatarUpload} disabled={!isEditing || !avatarFile || uploadingAvatar}>
                        {uploadingAvatar ? t('admin.profilePage.avatar.uploading') : t('admin.profilePage.avatar.updateAvatar')}
                    </button>
                    {avatarFile ? (
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => clearPendingAvatar()} disabled={!isEditing || uploadingAvatar}>
                            {t('admin.profilePage.avatar.clearSelection')}
                        </button>
                    ) : null}
                </div>
            </div>

            {error && <div className="alert alert-danger mb-3">{error}</div>}
            {message && <div className="alert alert-success mb-3">{message}</div>}
            {loading && <div className="alert alert-info mb-3">{t('admin.profilePage.messages.loadingProfile')}</div>}

            <div className="admin-profile-grid">
                <article className="admin-profile-item">
                    <span>{t('admin.profilePage.info.email')}</span>
                    <strong>{resolvedEmail}</strong>
                </article>
                <article className="admin-profile-item">
                    <span>{t('admin.profilePage.info.role')}</span>
                    <strong>{resolvedRoleLabel}</strong>
                </article>
                <article className="admin-profile-item">
                    <span>{t('admin.profilePage.info.createdAt')}</span>
                    <strong>{formatDateTime(resolvedCreatedAt, locale, t('admin.profilePage.info.noData'))}</strong>
                </article>
                <article className="admin-profile-item">
                    <span>{t('admin.profilePage.info.updatedAt')}</span>
                    <strong>{formatDateTime(resolvedUpdatedAt, locale, t('admin.profilePage.info.noData'))}</strong>
                </article>
                <article className="admin-profile-item">
                    <span>{t('admin.profilePage.info.phone')}</span>
                    <strong>{resolvedPhone}</strong>
                </article>
                <article className="admin-profile-item">
                    <span>{t('admin.profilePage.info.city')}</span>
                    <strong>{resolvedCity}</strong>
                </article>
                <article className="admin-profile-item">
                    <span>{t('admin.profilePage.info.address')}</span>
                    <strong>{resolvedAddress}</strong>
                </article>
                <article className="admin-profile-item">
                    <span>{t('admin.profilePage.info.status')}</span>
                    <strong className="admin-profile-status">
                        <ShieldCheck size={14} />
                        {t('admin.profilePage.info.active')}
                    </strong>
                </article>
            </div>

            <section className="admin-profile-form">
                <div className="admin-profile-form-head">
                    <div className="admin-profile-form-head-copy">
                        <h4>{t('admin.profilePage.form.title')}</h4>
                        <p>{t('admin.profilePage.form.subtitle')}</p>
                    </div>
                    {!isEditing ? (
                        <button type="button" className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1" onClick={handleStartEditing}>
                            <PencilLine size={14} />
                            <span>{t('admin.profilePage.form.editButton')}</span>
                        </button>
                    ) : (
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleCancelEditing} disabled={saving}>
                            {t('admin.profilePage.form.cancelButton')}
                        </button>
                    )}
                </div>

                <div className="admin-profile-form-grid">
                    <label className="admin-profile-field">
                        <span>{t('admin.profilePage.form.fields.fullName')}</span>
                        <input className="form-control" value={form.fullName} onChange={handleFieldChange('fullName')} disabled={!isEditing} />
                    </label>
                    <label className="admin-profile-field">
                        <span>{t('admin.profilePage.form.fields.email')}</span>
                        <input className="form-control" value={form.email} readOnly disabled />
                    </label>
                    <label className="admin-profile-field">
                        <span>{t('admin.profilePage.form.fields.phone')}</span>
                        <input className="form-control" value={form.phone} onChange={handleFieldChange('phone')} disabled={!isEditing} />
                    </label>
                    <label className="admin-profile-field">
                        <span>{t('admin.profilePage.form.fields.city')}</span>
                        <input className="form-control" value={form.city} onChange={handleFieldChange('city')} disabled={!isEditing} />
                    </label>
                    <label className="admin-profile-field admin-profile-field-span-2">
                        <span>{t('admin.profilePage.form.fields.address')}</span>
                        <input className="form-control" value={form.address} onChange={handleFieldChange('address')} disabled={!isEditing} />
                    </label>
                    <label className="admin-profile-field">
                        <span>{t('admin.profilePage.form.fields.position')}</span>
                        <input className="form-control" value={form.position} onChange={handleFieldChange('position')} disabled={!isEditing} />
                    </label>
                    <label className="admin-profile-field">
                        <span>{t('admin.profilePage.form.fields.personalLink')}</span>
                        <input className="form-control" value={form.personalLink} onChange={handleFieldChange('personalLink')} disabled={!isEditing} />
                    </label>
                </div>

                <div className="admin-profile-form-actions">
                    {isEditing ? (
                        <button type="button" className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
                            <Save size={14} className="me-2" />
                            {saving ? t('admin.profilePage.form.saving') : t('admin.profilePage.form.saveButton')}
                        </button>
                    ) : (
                        <span className="admin-profile-form-hint">{t('admin.profilePage.form.editHint')}</span>
                    )}
                </div>
            </section>

            <section className="admin-profile-settings">
                <div className="admin-profile-settings-head">
                    <p className="admin-profile-settings-kicker">{t('admin.profilePage.settings.kicker')}</p>
                    <h4>{t('admin.profilePage.settings.title')}</h4>
                    <p>{t('admin.profilePage.settings.subtitle')}</p>
                </div>
                <InstallAppPanel />
            </section>
        </section>
    );
};

export default AdminProfilePage;
