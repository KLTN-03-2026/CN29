import React, { useEffect, useState } from 'react';
import { Building2, Eye, Mail, MapPin, PencilLine, RotateCcw, Trash2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SmartPagination from '../../../components/SmartPagination';
import CalendarDatePicker from '../../../components/date/CalendarDatePicker';

const ROLE_CANDIDATE = 'Ứng viên';
const ROLE_EMPLOYER = 'Nhà tuyển dụng';
const ROLE_ADMIN = 'Quản trị';
const ROLE_SUPER_ADMIN = 'Siêu quản trị viên';

const normalizeRoleValue = (value) => {
    const text = String(value || '').trim();
    const normalized = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd');

    if (!normalized) return ROLE_CANDIDATE;
    if (normalized.includes('sieu quan tri') || normalized.includes('super admin')) return ROLE_SUPER_ADMIN;
    if (normalized.includes('quan tri') || normalized === 'admin') return ROLE_ADMIN;
    if (normalized.includes('nha tuyen dung') || normalized.includes('employer') || normalized.includes('recruiter')) return ROLE_EMPLOYER;
    if (normalized.includes('ung vien') || normalized.includes('candidate') || normalized === 'user') return ROLE_CANDIDATE;
    return text || ROLE_CANDIDATE;
};

const getRoleLabel = (value, t) => {
    const role = normalizeRoleValue(value);
    if (role === ROLE_SUPER_ADMIN) return t('admin.usersPage.roles.superAdmin');
    if (role === ROLE_ADMIN) return t('admin.usersPage.roles.admin');
    if (role === ROLE_EMPLOYER) return t('admin.usersPage.roles.employer');
    return t('admin.usersPage.roles.candidate');
};

const formatDateTime = (value, locale = 'vi-VN') => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const dateText = date.toLocaleDateString(locale);
    const timeText = date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
    });
    return `${dateText} ${timeText}`;
};

const formatDateOnly = (value, locale = 'vi-VN') => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString(locale);
};

const toInputDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const toSafeString = (value) => String(value ?? '').trim();

const createEmptyCandidateForm = () => ({
    birthday: '',
    gender: '',
    city: '',
    district: '',
    address: '',
    title: '',
    education: '',
    experience: 0,
    personalLink: '',
    intro: ''
});

const createEmptyEmployerForm = () => ({
    companyName: '',
    taxCode: '',
    website: '',
    city: '',
    address: '',
    description: ''
});

const buildEditForm = (user, detail) => {
    const detailUser = detail?.user || user || {};
    const candidate = detail?.candidateProfile || null;
    const employer = detail?.employerProfile || null;
    const role = normalizeRoleValue(detailUser?.VaiTro || ROLE_CANDIDATE);

    return {
        fullName: toSafeString(detailUser?.HoTen),
        email: toSafeString(detailUser?.Email),
        phone: toSafeString(detailUser?.SoDienThoai),
        address: toSafeString(detailUser?.DiaChi),
        role,
        status: Number(detailUser?.TrangThai ?? 1),
        candidateEnabled: role === ROLE_CANDIDATE,
        employerEnabled: role === ROLE_EMPLOYER,
        candidate: {
            birthday: toInputDate(candidate?.NgaySinh),
            gender: toSafeString(candidate?.GioiTinh),
            city: toSafeString(candidate?.ThanhPho),
            district: toSafeString(candidate?.QuanHuyen),
            address: toSafeString(candidate?.DiaChi),
            title: toSafeString(candidate?.ChucDanh),
            education: toSafeString(candidate?.TrinhDoHocVan),
            experience: Number(candidate?.SoNamKinhNghiem ?? candidate?.experience ?? 0),
            personalLink: toSafeString(candidate?.LinkCaNhan),
            intro: toSafeString(candidate?.GioiThieuBanThan)
        },
        employer: {
            companyName: toSafeString(employer?.TenCongTy),
            taxCode: toSafeString(employer?.MaSoThue),
            website: toSafeString(employer?.Website),
            city: toSafeString(employer?.ThanhPho),
            address: toSafeString(employer?.DiaChi),
            description: toSafeString(employer?.MoTa)
        }
    };
};

const buildUserUpdatePayload = (form) => {
    const role = normalizeRoleValue(form?.role || ROLE_CANDIDATE);
    const payload = {
        fullName: toSafeString(form?.fullName),
        email: toSafeString(form?.email),
        phone: toSafeString(form?.phone),
        address: toSafeString(form?.address),
        role,
        status: Number(form?.status ?? 1)
    };

    if (role === ROLE_CANDIDATE) {
        payload.candidateProfile = {
            birthday: toSafeString(form?.candidate?.birthday),
            gender: toSafeString(form?.candidate?.gender),
            city: toSafeString(form?.candidate?.city),
            district: toSafeString(form?.candidate?.district),
            address: toSafeString(form?.candidate?.address),
            title: toSafeString(form?.candidate?.title),
            education: toSafeString(form?.candidate?.education),
            experience: Number(form?.candidate?.experience ?? 0),
            personalLink: toSafeString(form?.candidate?.personalLink),
            intro: toSafeString(form?.candidate?.intro)
        };
    }

    if (role === ROLE_EMPLOYER) {
        payload.employerProfile = {
            companyName: toSafeString(form?.employer?.companyName),
            taxCode: toSafeString(form?.employer?.taxCode),
            website: toSafeString(form?.employer?.website),
            city: toSafeString(form?.employer?.city),
            address: toSafeString(form?.employer?.address),
            description: toSafeString(form?.employer?.description)
        };
    }

    return payload;
};

const isUserSoftDeleted = (user) => !!user?.NgayXoa;
const SOFT_DELETE_RETENTION_MS = 72 * 60 * 60 * 1000;

const parseDateValue = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    const normalized = String(value || '').trim();
    if (!normalized) return null;
    const parsed = new Date(normalized.includes('T') ? normalized : normalized.replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getSoftDeleteMeta = (user, nowMs = Date.now()) => {
    const deletedAt = parseDateValue(user?.NgayXoa);
    if (!deletedAt) return null;

    const expiresAtMs = deletedAt.getTime() + SOFT_DELETE_RETENTION_MS;
    return {
        expiresAtMs,
        remainingMs: expiresAtMs - nowMs,
        isExpired: expiresAtMs <= nowMs
    };
};

const formatSoftDeleteRemaining = (remainingMs, t) => {
    const totalMinutes = Math.max(1, Math.ceil(Math.max(remainingMs, 0) / 60000));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(t('admin.usersPage.time.days', { count: days }));
    if (hours > 0 || days > 0) parts.push(t('admin.usersPage.time.hours', { count: hours }));
    parts.push(t('admin.usersPage.time.minutes', { count: minutes }));
    return parts.join(' ');
};

const getUserPermissions = (user, isSuperAdmin, isAdmin) => {
    const isTargetSuperAdmin = Number(user?.IsSuperAdmin) === 1;
    const role = normalizeRoleValue(user?.VaiTro);
    const isTargetAdmin = role === ROLE_ADMIN || role === ROLE_SUPER_ADMIN || isTargetSuperAdmin;
    const canManage = (isSuperAdmin || isAdmin) && !isTargetAdmin;
    return {
        canEdit: canManage,
        canDelete: canManage
    };
};

const getStatusBadge = (user, t, nowMs = Date.now()) => {
    const softDeleteMeta = getSoftDeleteMeta(user, nowMs);
    if (softDeleteMeta) {
        return (
            <span className={`badge ${softDeleteMeta.isExpired ? 'bg-secondary-subtle text-secondary' : 'bg-danger-subtle text-danger'}`}>
                {t('admin.usersPage.status.softDeleted')}
            </span>
        );
    }
    const status = Number(user?.TrangThai ?? 1);
    if (status === 1) {
        return <span className="badge bg-success-subtle text-success">{t('admin.usersPage.status.active')}</span>;
    }
    return <span className="badge bg-warning-subtle text-warning-emphasis">{t('admin.usersPage.status.blocked')}</span>;
};

const UserInfoField = ({ label, value, className = '', noWrap = false }) => {
    const rawValue = value === 0 ? '0' : String(value ?? '').trim();
    const displayValue = rawValue || '-';
    const isLink = /^https?:\/\//i.test(displayValue);

    return (
        <div className={`admin-users-info-field ${noWrap ? 'is-nowrap' : ''} ${className}`.trim()}>
            <small>{label}</small>
            <div className={`admin-users-info-value ${isLink ? 'is-link' : ''}`.trim()}>
                {isLink ? (
                    <a href={displayValue} target="_blank" rel="noreferrer">{displayValue}</a>
                ) : (
                    <span>{displayValue}</span>
                )}
            </div>
        </div>
    );
};

const AdminUsersPage = ({
    users,
    pagination,
    loading,
    roleFilter,
    onRoleFilterChange,
    onRangeChange,
    isSuperAdmin,
    isAdmin,
    requestConfirm,
    onSaveUser,
    onDeleteUser,
    onRestoreUser,
    onViewUserDetail
}) => {
    const { t, i18n } = useTranslation();
    const locale = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase().startsWith('en')
        ? 'en-US'
        : 'vi-VN';

    const totalUsers = Math.max(0, Number(pagination?.total) || users.length || 0);
    const perPage = Math.max(1, Number(pagination?.limit) || 10);
    const fromDisplay = totalUsers > 0 ? Math.max(1, Number(pagination?.from) || 1) : 0;
    const toDisplay = totalUsers > 0
        ? Math.max(fromDisplay, Math.min(totalUsers, Number(pagination?.to) || (fromDisplay + users.length - 1)))
        : 0;

    const [rowBusyId, setRowBusyId] = useState(null);
    const [rowErrors, setRowErrors] = useState({});
    const [nowTick, setNowTick] = useState(Date.now());
    const [viewModal, setViewModal] = useState({
        open: false,
        user: null,
        detail: null,
        loading: false,
        error: ''
    });
    const [editModal, setEditModal] = useState({
        open: false,
        user: null,
        loadingDetail: false,
        form: {
            fullName: '',
            email: '',
            phone: '',
            address: '',
            role: ROLE_CANDIDATE,
            status: 1,
            candidateEnabled: false,
            employerEnabled: false,
            candidate: createEmptyCandidateForm(),
            employer: createEmptyEmployerForm()
        },
        initialSnapshot: '',
        saving: false,
        error: ''
    });

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNowTick(Date.now());
        }, 30000);

        return () => window.clearInterval(timer);
    }, []);

    const setRowError = (userId, message) => {
        setRowErrors((prev) => ({ ...prev, [userId]: message }));
    };

    const clearRowError = (userId) => {
        setRowErrors((prev) => {
            if (!prev[userId]) return prev;
            const next = { ...prev };
            delete next[userId];
            return next;
        });
    };

    const openViewModal = async (user) => {
        const userId = user.MaNguoiDung;
        clearRowError(userId);
        setViewModal({
            open: true,
            user,
            detail: null,
            loading: true,
            error: ''
        });

        if (typeof onViewUserDetail !== 'function') {
            setViewModal((prev) => ({
                ...prev,
                loading: false,
                error: t('admin.usersPage.messages.detailApiMissing')
            }));
            return;
        }

        try {
            const detail = await onViewUserDetail(userId);
            setViewModal((prev) => ({ ...prev, detail, loading: false, error: '' }));
        } catch (error) {
            setViewModal((prev) => ({
                ...prev,
                loading: false,
                error: error?.message || t('admin.usersPage.messages.loadDetailFailed')
            }));
        }
    };

    const openEditModal = async (user) => {
        clearRowError(user.MaNguoiDung);
        const initialForm = buildEditForm(user, null);
        setEditModal({
            open: true,
            user,
            loadingDetail: true,
            form: initialForm,
            initialSnapshot: JSON.stringify(buildUserUpdatePayload(initialForm)),
            saving: false,
            error: ''
        });

        if (typeof onViewUserDetail !== 'function') {
            setEditModal((prev) => ({ ...prev, loadingDetail: false }));
            return;
        }

        try {
            const detail = await onViewUserDetail(user.MaNguoiDung);
            const nextForm = buildEditForm(user, detail);
            setEditModal((prev) => ({
                ...prev,
                loadingDetail: false,
                form: nextForm,
                initialSnapshot: JSON.stringify(buildUserUpdatePayload(nextForm)),
                error: ''
            }));
        } catch (error) {
            setEditModal((prev) => ({
                ...prev,
                loadingDetail: false,
                error: error?.message || t('admin.usersPage.messages.loadEditDetailFailed')
            }));
        }
    };

    const closeEditModal = () => {
        setEditModal({
            open: false,
            user: null,
            loadingDetail: false,
            form: {
                fullName: '',
                email: '',
                phone: '',
                address: '',
                role: ROLE_CANDIDATE,
                status: 1,
                candidateEnabled: false,
                employerEnabled: false,
                candidate: createEmptyCandidateForm(),
                employer: createEmptyEmployerForm()
            },
            initialSnapshot: '',
            saving: false,
            error: ''
        });
    };

    const updateEditField = (field, value) => {
        setEditModal((prev) => ({
            ...prev,
            form: {
                ...prev.form,
                [field]: value
            }
        }));
    };

    const updateRole = (role) => {
        const normalizedRole = normalizeRoleValue(role);
        setEditModal((prev) => ({
            ...prev,
            form: {
                ...prev.form,
                role: normalizedRole,
                candidateEnabled: normalizedRole === ROLE_CANDIDATE,
                employerEnabled: normalizedRole === ROLE_EMPLOYER
            }
        }));
    };

    const updateCandidateField = (field, value) => {
        setEditModal((prev) => ({
            ...prev,
            form: {
                ...prev.form,
                candidate: {
                    ...prev.form.candidate,
                    [field]: value
                }
            }
        }));
    };

    const updateEmployerField = (field, value) => {
        setEditModal((prev) => ({
            ...prev,
            form: {
                ...prev.form,
                employer: {
                    ...prev.form.employer,
                    [field]: value
                }
            }
        }));
    };

    const submitEditModal = async () => {
        if (!editModal.user || typeof onSaveUser !== 'function') return;
        const userId = editModal.user.MaNguoiDung;
        setEditModal((prev) => ({ ...prev, saving: true, error: '' }));
        setRowBusyId(userId);
        clearRowError(userId);
        try {
            await onSaveUser(userId, buildUserUpdatePayload(editModal.form));
            closeEditModal();
        } catch (error) {
            const message = error?.message || t('admin.usersPage.messages.updateFailed');
            setEditModal((prev) => ({ ...prev, saving: false, error: message }));
            setRowError(userId, message);
        } finally {
            setRowBusyId(null);
        }
    };

    const handleDeleteOrRestore = async (user) => {
        const userId = user.MaNguoiDung;
        const isDeleted = isUserSoftDeleted(user);
        if (typeof requestConfirm !== 'function') return;
        const actionText = isDeleted ? t('admin.usersPage.actions.restore') : t('admin.usersPage.actions.softDelete');
        const confirmText = isDeleted ? t('admin.usersPage.confirm.restoreButton') : t('admin.usersPage.confirm.deleteButton');
        const confirmMessage = isDeleted
            ? t('admin.usersPage.confirm.restoreMessage')
            : t('admin.usersPage.confirm.deleteMessage');
        const ok = await requestConfirm({
            title: t('admin.usersPage.confirm.title', { action: actionText }),
            message: confirmMessage,
            confirmText
        });
        if (!ok) return;

        setRowBusyId(userId);
        clearRowError(userId);
        try {
            if (isDeleted) {
                if (typeof onRestoreUser !== 'function') {
                    throw new Error(t('admin.usersPage.messages.restoreHandlerMissing'));
                }
                await onRestoreUser(userId);
            } else {
                await onDeleteUser(userId);
            }
        } catch (error) {
            setRowError(userId, error?.message || t('admin.usersPage.messages.actionFailed'));
        } finally {
            setRowBusyId(null);
        }
    };

    const detailUser = viewModal.detail?.user || viewModal.user;
    const avatarUrl = viewModal.detail?.avatarAbsoluteUrl || viewModal.detail?.avatarUrl || '';
    const candidateProfile = viewModal.detail?.candidateProfile || null;
    const employerProfile = viewModal.detail?.employerProfile || null;
    const editRole = normalizeRoleValue(editModal.form.role);
    const showCandidateSection = editRole === ROLE_CANDIDATE;
    const showEmployerSection = editRole === ROLE_EMPLOYER;

    const currentEditSnapshot = JSON.stringify(buildUserUpdatePayload(editModal.form));
    const editDirty = Boolean(editModal.user) && (
        currentEditSnapshot !== editModal.initialSnapshot
    );

    return (
        <>
            <div className="card border-0 shadow-sm admin-module-card mb-4">
                <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <h5 className="mb-0 d-flex align-items-center gap-2">
                        <Users size={18} />
                        <span>{t('admin.usersPage.title')}</span>
                    </h5>
                    <div className="d-flex align-items-center gap-2">
                        <select
                            className="form-select form-select-sm"
                            style={{ minWidth: 170 }}
                            value={roleFilter}
                            onChange={(e) => {
                                const nextRole = e.target.value;
                                onRoleFilterChange(nextRole);
                            }}
                            aria-label={t('admin.usersPage.filter.roleAriaLabel')}
                        >
                            <option value="all">{t('admin.usersPage.filter.all')}</option>
                            <option value={ROLE_CANDIDATE}>{t('admin.usersPage.roles.candidate')}</option>
                            <option value={ROLE_EMPLOYER}>{t('admin.usersPage.roles.employer')}</option>
                            <option value={ROLE_ADMIN}>{t('admin.usersPage.roles.admin')}</option>
                        </select>
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th style={{ width: 80 }}>{t('admin.usersPage.columns.id')}</th>
                                <th style={{ width: 260 }}>{t('admin.usersPage.columns.fullName')}</th>
                                <th>{t('admin.usersPage.columns.email')}</th>
                                <th style={{ width: 180 }}>{t('admin.usersPage.columns.role')}</th>
                                <th style={{ width: 160 }}>{t('admin.usersPage.columns.status')}</th>
                                <th style={{ width: 190 }}>{t('admin.usersPage.columns.createdAt')}</th>
                                <th style={{ width: 190 }}>{t('admin.usersPage.columns.deletedAt')}</th>
                                <th style={{ width: 280 }} className="admin-action-col">{t('admin.usersPage.columns.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user, index) => {
                                const userId = user.MaNguoiDung;
                                const isDeleted = isUserSoftDeleted(user);
                                const softDeleteMeta = getSoftDeleteMeta(user, nowTick);
                                const permissions = getUserPermissions(user, isSuperAdmin, isAdmin);
                                const busy = rowBusyId === userId;
                                return (
                                    <tr key={userId}>
                                        <td>{fromDisplay + index}</td>
                                        <td className="admin-users-name-cell" title={user.HoTen || '-'}>{user.HoTen || '-'}</td>
                                        <td>{user.Email}</td>
                                        <td>
                                            <span className="badge rounded-pill text-bg-light border">{getRoleLabel(user.VaiTro, t)}</span>
                                        </td>
                                        <td>{getStatusBadge(user, t, nowTick)}</td>
                                        <td>{formatDateTime(user.NgayTao, locale)}</td>
                                        <td>
                                            <div>{formatDateTime(user.NgayXoa, locale)}</div>
                                            {softDeleteMeta ? (
                                                <small className={`d-block mt-1 ${softDeleteMeta.isExpired ? 'text-danger' : 'text-muted'}`}>
                                                    {softDeleteMeta.isExpired
                                                        ? t('admin.usersPage.softDelete.expiredHint')
                                                        : t('admin.usersPage.softDelete.remainingHint', { time: formatSoftDeleteRemaining(softDeleteMeta.remainingMs, t) })}
                                                </small>
                                            ) : null}
                                        </td>
                                        <td className="admin-action-col">
                                            <div className="admin-row-actions">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-info admin-action-icon-btn"
                                                    onClick={() => openViewModal(user)}
                                                    disabled={busy}
                                                    title={t('admin.usersPage.actions.view')}
                                                    aria-label={t('admin.usersPage.actions.view')}
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary admin-action-icon-btn"
                                                    onClick={() => openEditModal(user)}
                                                    disabled={!permissions.canEdit || busy}
                                                    title={t('admin.usersPage.actions.edit')}
                                                    aria-label={t('admin.usersPage.actions.edit')}
                                                >
                                                    <PencilLine size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm admin-action-icon-btn ${isDeleted ? 'btn-outline-success' : 'btn-outline-danger'}`}
                                                    onClick={() => handleDeleteOrRestore(user)}
                                                    disabled={!permissions.canDelete || busy}
                                                    title={isDeleted ? t('admin.usersPage.actions.restore') : t('admin.usersPage.actions.delete')}
                                                    aria-label={isDeleted ? t('admin.usersPage.actions.restore') : t('admin.usersPage.actions.delete')}
                                                >
                                                    {isDeleted ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                                                </button>
                                            </div>
                                            {rowErrors[userId] ? <div className="text-danger small mt-1 admin-users-row-error">{rowErrors[userId]}</div> : null}
                                        </td>
                                    </tr>
                                );
                            })}
                            {users.length === 0 && !loading && (
                                <tr><td colSpan={8} className="text-center text-muted py-4">{t('admin.usersPage.empty')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalUsers > 0 && (
                    <div className="d-flex justify-content-end p-3 border-top bg-white">
                        <SmartPagination
                            from={fromDisplay}
                            to={toDisplay}
                            pageSize={perPage}
                            perPage={perPage}
                            totalItems={totalUsers}
                            loading={loading}
                            onRangeChange={(nextFrom, nextTo) => {
                                if (typeof onRangeChange === 'function') {
                                    onRangeChange(nextFrom, nextTo, roleFilter);
                                }
                            }}
                        />
                    </div>
                )}
            </div>

            {viewModal.open && (
                <div className="admin-confirm-backdrop" role="dialog" aria-modal="true">
                    <div className="admin-confirm-dialog admin-users-view-dialog card border-0 shadow-sm">
                        <div className="card-header bg-white border-0 d-flex align-items-center justify-content-between admin-users-view-header">
                            <h5 className="mb-0">{t('admin.usersPage.viewModal.title')}</h5>
                            <button type="button" className="admin-users-close-btn" onClick={() => setViewModal({ open: false, user: null, detail: null, loading: false, error: '' })}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="card-body">
                            {viewModal.loading && <div className="alert alert-info mb-0">{t('admin.usersPage.messages.loadingDetail')}</div>}
                            {!viewModal.loading && viewModal.error && <div className="alert alert-danger mb-0">{viewModal.error}</div>}

                            {!viewModal.loading && !viewModal.error && detailUser && (
                                <div className="admin-users-view-layout">
                                    <aside className="admin-users-profile-panel">
                                        {avatarUrl ? (
                                            <img
                                                src={avatarUrl}
                                                alt={t('admin.usersPage.viewModal.avatarAlt')}
                                                className="admin-users-avatar"
                                            />
                                        ) : (
                                            <div className="admin-users-avatar admin-users-avatar-fallback">
                                                {(detailUser.HoTen || detailUser.Email || '?').charAt(0).toUpperCase()}
                                            </div>
                                        )}

                                        <div className="admin-users-profile-name">{detailUser.HoTen || '-'}</div>
                                        <div className="admin-users-profile-email">
                                            <Mail size={14} />
                                            <span>{detailUser.Email || '-'}</span>
                                        </div>

                                        <div className="admin-users-profile-tags">
                                            <span className="badge rounded-pill text-bg-light border">{getRoleLabel(detailUser.VaiTro, t)}</span>
                                            {getStatusBadge(detailUser, t, nowTick)}
                                        </div>

                                        <div className="admin-users-profile-meta">
                                            <div className="admin-users-profile-meta-item">
                                                <span>{t('admin.usersPage.viewModal.userCode')}</span>
                                                <strong>{viewModal.user?.MaNguoiDung || '-'}</strong>
                                            </div>
                                            <div className="admin-users-profile-meta-item">
                                                <span>{t('admin.usersPage.columns.createdAt')}</span>
                                                <strong>{formatDateTime(detailUser.NgayTao, locale)}</strong>
                                            </div>
                                            <div className="admin-users-profile-meta-item">
                                                <span>{t('admin.usersPage.viewModal.updatedAt')}</span>
                                                <strong>{formatDateTime(detailUser.NgayCapNhat, locale)}</strong>
                                            </div>
                                        </div>
                                    </aside>

                                    <div className="admin-users-detail-panels">
                                        <section className="admin-users-section-card">
                                            <h6 className="mb-2">{t('admin.usersPage.viewModal.basicInfo')}</h6>
                                            <div className="admin-users-field-grid">
                                                <UserInfoField label={t('admin.usersPage.fields.phone')} value={detailUser.SoDienThoai} className="admin-users-info-card" />
                                                <UserInfoField label={t('admin.usersPage.fields.address')} value={detailUser.DiaChi} className="admin-users-info-card" />
                                                <UserInfoField label={t('admin.usersPage.columns.createdAt')} value={formatDateTime(detailUser.NgayTao, locale)} className="admin-users-info-card" noWrap />
                                                <UserInfoField label={t('admin.usersPage.viewModal.updatedAt')} value={formatDateTime(detailUser.NgayCapNhat, locale)} className="admin-users-info-card" noWrap />
                                                <UserInfoField label={t('admin.usersPage.columns.deletedAt')} value={formatDateTime(detailUser.NgayXoa, locale)} className="admin-users-info-card" noWrap />
                                            </div>
                                        </section>

                                        {candidateProfile && (
                                            <section className="admin-users-section-card">
                                                <h6 className="mb-2 d-flex align-items-center gap-2">
                                                    <MapPin size={16} />
                                                    {t('admin.usersPage.viewModal.candidateInfo')}
                                                </h6>
                                                <div className="admin-users-field-grid">
                                                    <UserInfoField label={t('admin.usersPage.candidateFields.title')} value={candidateProfile.ChucDanh} className="admin-users-info-card" />
                                                    <UserInfoField label={t('admin.usersPage.candidateFields.gender')} value={candidateProfile.GioiTinh} className="admin-users-info-card" />
                                                    <UserInfoField label={t('admin.usersPage.candidateFields.birthday')} value={formatDateOnly(candidateProfile.NgaySinh, locale)} className="admin-users-info-card" noWrap />
                                                    <UserInfoField label={t('admin.usersPage.candidateFields.city')} value={candidateProfile.ThanhPho} className="admin-users-info-card" />
                                                    <UserInfoField label={t('admin.usersPage.candidateFields.district')} value={candidateProfile.QuanHuyen} className="admin-users-info-card" />
                                                    <UserInfoField label={t('admin.usersPage.candidateFields.detailedAddress')} value={candidateProfile.DiaChi} className="admin-users-info-card" />
                                                    <UserInfoField label={t('admin.usersPage.candidateFields.education')} value={candidateProfile.TrinhDoHocVan} className="admin-users-info-card" />
                                                    <UserInfoField label={t('admin.usersPage.candidateFields.experience')} value={candidateProfile.SoNamKinhNghiem} className="admin-users-info-card" />
                                                    <UserInfoField label={t('admin.usersPage.candidateFields.personalLink')} value={candidateProfile.LinkCaNhan} className="admin-users-info-card" />
                                                </div>
                                                {candidateProfile.GioiThieuBanThan ? (
                                                    <div className="mt-2 admin-users-note-box">
                                                        <small className="text-muted d-block">{t('admin.usersPage.candidateFields.intro')}</small>
                                                        <div>{candidateProfile.GioiThieuBanThan}</div>
                                                    </div>
                                                ) : null}
                                            </section>
                                        )}

                                        {employerProfile && (
                                            <section className="admin-users-section-card">
                                                <h6 className="mb-2 d-flex align-items-center gap-2">
                                                    <Building2 size={16} />
                                                    {t('admin.usersPage.viewModal.employerInfo')}
                                                </h6>
                                                <div className="admin-users-field-grid">
                                                    <UserInfoField label={t('admin.usersPage.employerFields.companyName')} value={employerProfile.TenCongTy} className="admin-users-info-card" />
                                                    <UserInfoField label={t('admin.usersPage.employerFields.taxCode')} value={employerProfile.MaSoThue} className="admin-users-info-card" />
                                                    <UserInfoField label={t('admin.usersPage.employerFields.website')} value={employerProfile.Website} className="admin-users-info-card" />
                                                    <UserInfoField label={t('admin.usersPage.employerFields.city')} value={employerProfile.ThanhPho} className="admin-users-info-card" />
                                                    <UserInfoField label={t('admin.usersPage.employerFields.address')} value={employerProfile.DiaChi} className="admin-users-info-card" />
                                                </div>
                                                {employerProfile.MoTa ? (
                                                    <div className="mt-2 admin-users-note-box">
                                                        <small className="text-muted d-block">{t('admin.usersPage.employerFields.description')}</small>
                                                        <div>{employerProfile.MoTa}</div>
                                                    </div>
                                                ) : null}
                                            </section>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!viewModal.loading && !viewModal.error && (
                                <div className="admin-users-view-footer mt-3">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => setViewModal({ open: false, user: null, detail: null, loading: false, error: '' })}
                                    >
                                        {t('common.cancel')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {editModal.open && (
                <div className="admin-confirm-backdrop" role="dialog" aria-modal="true">
                    <div className="admin-confirm-dialog admin-users-edit-dialog card border-0 shadow-sm">
                        <div className="card-body">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <h5 className="mb-0">{t('admin.usersPage.editModal.title', { id: editModal.user?.MaNguoiDung })}</h5>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={closeEditModal}
                                    disabled={editModal.saving}
                                >
                                    {t('common.close')}
                                </button>
                            </div>

                            {editModal.loadingDetail ? (
                                <div className="alert alert-info mb-0">{t('admin.usersPage.messages.loadingEditDetail')}</div>
                            ) : (
                                <>
                                    <div className="admin-users-edit-section">
                                        <h6 className="mb-3">{t('admin.usersPage.editModal.basicInfo')}</h6>
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label">{t('admin.usersPage.fields.fullName')}</label>
                                                <input
                                                    className="form-control"
                                                    value={editModal.form.fullName}
                                                    onChange={(e) => updateEditField('fullName', e.target.value)}
                                                    disabled={editModal.saving}
                                                    placeholder={t('admin.usersPage.editModal.placeholders.fullName')}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">{t('admin.usersPage.fields.email')}</label>
                                                <input
                                                    type="email"
                                                    className="form-control"
                                                    value={editModal.form.email}
                                                    onChange={(e) => updateEditField('email', e.target.value)}
                                                    disabled={editModal.saving}
                                                    placeholder="name@example.com"
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">{t('admin.usersPage.fields.phone')}</label>
                                                <input
                                                    className="form-control"
                                                    value={editModal.form.phone}
                                                    onChange={(e) => updateEditField('phone', e.target.value)}
                                                    disabled={editModal.saving}
                                                    placeholder={t('admin.usersPage.editModal.placeholders.phone')}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">{t('admin.usersPage.fields.address')}</label>
                                                <input
                                                    className="form-control"
                                                    value={editModal.form.address}
                                                    onChange={(e) => updateEditField('address', e.target.value)}
                                                    disabled={editModal.saving}
                                                    placeholder={t('admin.usersPage.editModal.placeholders.address')}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">{t('admin.usersPage.columns.role')}</label>
                                                <select
                                                    className="form-select"
                                                    value={editModal.form.role}
                                                    onChange={(e) => updateRole(e.target.value)}
                                                    disabled={editModal.saving}
                                                >
                                                    <option value={ROLE_CANDIDATE}>{t('admin.usersPage.roles.candidate')}</option>
                                                    <option value={ROLE_EMPLOYER}>{t('admin.usersPage.roles.employer')}</option>
                                                    <option value={ROLE_ADMIN}>{t('admin.usersPage.roles.admin')}</option>
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">{t('admin.usersPage.columns.status')}</label>
                                                <select
                                                    className="form-select"
                                                    value={editModal.form.status}
                                                    onChange={(e) => updateEditField('status', Number(e.target.value))}
                                                    disabled={editModal.saving}
                                                >
                                                    <option value={1}>{t('admin.usersPage.status.active')}</option>
                                                    <option value={0}>{t('admin.usersPage.status.blocked')}</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {showCandidateSection && (
                                        <div className="admin-users-edit-section mt-3">
                                            <div className="d-flex align-items-center justify-content-between mb-3">
                                                <h6 className="mb-0">{t('admin.usersPage.editModal.candidateProfile')}</h6>
                                            </div>

                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <label className="form-label">{t('admin.usersPage.candidateFields.birthday')}</label>
                                                    <CalendarDatePicker
                                                        value={editModal.form.candidate.birthday}
                                                        onChange={(nextValue) => updateCandidateField('birthday', nextValue)}
                                                        placeholder={t('admin.usersPage.editModal.placeholders.birthday')}
                                                        maxDate={new Date()}
                                                        disabled={editModal.saving}
                                                        inputClassName="form-control"
                                                    />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">{t('admin.usersPage.candidateFields.gender')}</label>
                                                    <select
                                                        className="form-select"
                                                        value={editModal.form.candidate.gender}
                                                        onChange={(e) => updateCandidateField('gender', e.target.value)}
                                                        disabled={editModal.saving}
                                                    >
                                                        <option value="">{t('admin.usersPage.editModal.gender.unselected')}</option>
                                                        <option value="Nam">{t('admin.usersPage.editModal.gender.male')}</option>
                                                        <option value="Nữ">{t('admin.usersPage.editModal.gender.female')}</option>
                                                        <option value="Khác">{t('admin.usersPage.editModal.gender.other')}</option>
                                                    </select>
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">{t('admin.usersPage.candidateFields.experience')}</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={60}
                                                        className="form-control"
                                                        value={editModal.form.candidate.experience}
                                                        onChange={(e) => updateCandidateField('experience', Number(e.target.value || 0))}
                                                        disabled={editModal.saving}
                                                    />
                                                </div>

                                                <div className="col-md-4">
                                                    <label className="form-label">{t('admin.usersPage.candidateFields.city')}</label>
                                                    <input
                                                        className="form-control"
                                                        value={editModal.form.candidate.city}
                                                        onChange={(e) => updateCandidateField('city', e.target.value)}
                                                        disabled={editModal.saving}
                                                    />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">{t('admin.usersPage.candidateFields.district')}</label>
                                                    <input
                                                        className="form-control"
                                                        value={editModal.form.candidate.district}
                                                        onChange={(e) => updateCandidateField('district', e.target.value)}
                                                        disabled={editModal.saving}
                                                    />
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label">{t('admin.usersPage.candidateFields.title')}</label>
                                                    <input
                                                        className="form-control"
                                                        value={editModal.form.candidate.title}
                                                        onChange={(e) => updateCandidateField('title', e.target.value)}
                                                        disabled={editModal.saving}
                                                    />
                                                </div>

                                                <div className="col-md-6">
                                                    <label className="form-label">{t('admin.usersPage.candidateFields.education')}</label>
                                                    <input
                                                        className="form-control"
                                                        value={editModal.form.candidate.education}
                                                        onChange={(e) => updateCandidateField('education', e.target.value)}
                                                        disabled={editModal.saving}
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label">{t('admin.usersPage.candidateFields.personalLink')}</label>
                                                    <input
                                                        className="form-control"
                                                        value={editModal.form.candidate.personalLink}
                                                        onChange={(e) => updateCandidateField('personalLink', e.target.value)}
                                                        disabled={editModal.saving}
                                                        placeholder="https://..."
                                                    />
                                                </div>

                                                <div className="col-12">
                                                    <label className="form-label">{t('admin.usersPage.candidateFields.detailedAddress')}</label>
                                                    <input
                                                        className="form-control"
                                                        value={editModal.form.candidate.address}
                                                        onChange={(e) => updateCandidateField('address', e.target.value)}
                                                        disabled={editModal.saving}
                                                    />
                                                </div>
                                                <div className="col-12">
                                                    <label className="form-label">{t('admin.usersPage.candidateFields.intro')}</label>
                                                    <textarea
                                                        rows={3}
                                                        className="form-control"
                                                        value={editModal.form.candidate.intro}
                                                        onChange={(e) => updateCandidateField('intro', e.target.value)}
                                                        disabled={editModal.saving}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {showEmployerSection && (
                                        <div className="admin-users-edit-section mt-3">
                                            <div className="d-flex align-items-center justify-content-between mb-3">
                                                <h6 className="mb-0">{t('admin.usersPage.editModal.employerProfile')}</h6>
                                            </div>

                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label">{t('admin.usersPage.employerFields.companyName')}</label>
                                                    <input
                                                        className="form-control"
                                                        value={editModal.form.employer.companyName}
                                                        onChange={(e) => updateEmployerField('companyName', e.target.value)}
                                                        disabled={editModal.saving}
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label">{t('admin.usersPage.employerFields.taxCode')}</label>
                                                    <input
                                                        className="form-control"
                                                        value={editModal.form.employer.taxCode}
                                                        onChange={(e) => updateEmployerField('taxCode', e.target.value)}
                                                        disabled={editModal.saving}
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label">{t('admin.usersPage.employerFields.website')}</label>
                                                    <input
                                                        className="form-control"
                                                        value={editModal.form.employer.website}
                                                        onChange={(e) => updateEmployerField('website', e.target.value)}
                                                        disabled={editModal.saving}
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label">{t('admin.usersPage.employerFields.city')}</label>
                                                    <input
                                                        className="form-control"
                                                        value={editModal.form.employer.city}
                                                        onChange={(e) => updateEmployerField('city', e.target.value)}
                                                        disabled={editModal.saving}
                                                    />
                                                </div>
                                                <div className="col-12">
                                                    <label className="form-label">{t('admin.usersPage.employerFields.address')}</label>
                                                    <input
                                                        className="form-control"
                                                        value={editModal.form.employer.address}
                                                        onChange={(e) => updateEmployerField('address', e.target.value)}
                                                        disabled={editModal.saving}
                                                    />
                                                </div>
                                                <div className="col-12">
                                                    <label className="form-label">{t('admin.usersPage.employerFields.description')}</label>
                                                    <textarea
                                                        rows={3}
                                                        className="form-control"
                                                        value={editModal.form.employer.description}
                                                        onChange={(e) => updateEmployerField('description', e.target.value)}
                                                        disabled={editModal.saving}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {editModal.user?.NgayXoa ? (
                                        <div className="alert alert-warning mt-3 mb-0">
                                            {t('admin.usersPage.editModal.softDeletedNote', { deletedAt: formatDateTime(editModal.user.NgayXoa, locale) })}
                                        </div>
                                    ) : null}

                                    {editModal.error ? <div className="text-danger small mt-2">{editModal.error}</div> : null}

                                    <div className="d-flex justify-content-end gap-2 mt-4">
                                        <button type="button" className="btn btn-outline-secondary" onClick={closeEditModal} disabled={editModal.saving}>
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={submitEditModal}
                                            disabled={editModal.saving || !editDirty || editModal.loadingDetail}
                                        >
                                            {editModal.saving ? t('admin.usersPage.editModal.saving') : t('admin.usersPage.editModal.save')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </>
    );
};

export default AdminUsersPage;
