import React, { useEffect, useState } from 'react';
import { Ban, Building2, CalendarDays, Eye, Globe, Mail, MapPin, RotateCcw, ShieldCheck, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SmartPagination from '../../../components/SmartPagination';

const normalizeWebsiteUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
};

const COMPANY_SOFT_DELETE_RETENTION_MS = 72 * 60 * 60 * 1000;

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

const isCompanySoftDeleted = (company) => Boolean(company?.NgayXoa);

const getSoftDeleteMeta = (company, nowMs = Date.now()) => {
    const deletedAt = parseDateValue(company?.NgayXoa);
    if (!deletedAt) return null;

    const expiresAtMs = deletedAt.getTime() + COMPANY_SOFT_DELETE_RETENTION_MS;
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
    if (days > 0) parts.push(t('admin.companiesPage.time.days', { count: days }));
    if (hours > 0 || days > 0) parts.push(t('admin.companiesPage.time.hours', { count: hours }));
    parts.push(t('admin.companiesPage.time.minutes', { count: minutes }));
    return parts.join(' ');
};

const getCompanyStatusLabel = (value, t) => {
    return Number(value) === 1
        ? t('admin.companiesPage.status.active')
        : t('admin.companiesPage.status.blocked');
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

const renderCompanyStatusBadge = (company, t, nowTick) => {
    const softDeleteMeta = getSoftDeleteMeta(company, nowTick);
    if (softDeleteMeta) {
        return <span className="badge bg-danger-subtle text-danger">{t('admin.companiesPage.status.softDeleted')}</span>;
    }

    const value = Number(company?.TrangThaiDaiDien ?? 1);
    if (Number(value) === 1) {
        return <span className="badge bg-success-subtle text-success">{t('admin.companiesPage.status.active')}</span>;
    }
    return <span className="badge bg-warning-subtle text-warning-emphasis">{t('admin.companiesPage.status.blocked')}</span>;
};

const AdminCompanyDetailModal = ({ company, onClose, nowTick }) => {
    const { t, i18n } = useTranslation();
    const locale = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase().startsWith('en')
        ? 'en-US'
        : 'vi-VN';
    const websiteHref = normalizeWebsiteUrl(company?.Website);
    const logoUrl = String(company?.LogoCongTy || company?.Logo || '').trim();
    const avatarFallback = (company?.TenCongTy || company?.EmailDaiDien || '?').charAt(0).toUpperCase();
    const softDeleteMeta = getSoftDeleteMeta(company, nowTick);

    return (
        <div className="admin-confirm-backdrop" role="dialog" aria-modal="true" aria-label={t('admin.companiesPage.detail.ariaLabel')}>
            <div className="admin-confirm-dialog admin-company-view-dialog card border-0 shadow-sm">
                <div className="card-header bg-white border-0 d-flex align-items-center justify-content-between admin-users-view-header">
                    <h5 className="mb-0">{t('admin.companiesPage.detail.title')}</h5>
                    <button type="button" className="admin-users-close-btn" onClick={onClose}>
                        <X size={14} />
                    </button>
                </div>
                <div className="card-body">
                    <div className="admin-company-view-layout">
                        <aside className="admin-users-profile-panel admin-company-profile-panel">
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt={t('admin.companiesPage.detail.logoAlt')}
                                    className="admin-users-avatar admin-company-avatar"
                                />
                            ) : (
                                <div className="admin-users-avatar admin-users-avatar-fallback admin-company-avatar">
                                    {avatarFallback}
                                </div>
                            )}

                            <div className="admin-users-profile-name">{company?.TenCongTy || '-'}</div>
                            <div className="admin-users-profile-email">
                                <Mail size={14} />
                                <span>{company?.EmailDaiDien || '-'}</span>
                            </div>

                            <div className="admin-users-profile-tags">
                                {renderCompanyStatusBadge(company, t, nowTick)}
                            </div>

                            <div className="admin-users-profile-meta">
                                <div className="admin-users-profile-meta-item">
                                    <span>{t('admin.companiesPage.detail.companyCode')}</span>
                                    <strong>{company?.MaCongTy ?? '-'}</strong>
                                </div>
                                <div className="admin-users-profile-meta-item">
                                    <span>{t('admin.companiesPage.detail.createdAt')}</span>
                                    <strong>{formatDateTime(company?.NgayTao, locale)}</strong>
                                </div>
                                <div className="admin-users-profile-meta-item">
                                    <span>{t('admin.companiesPage.detail.updatedAt')}</span>
                                    <strong>{formatDateTime(company?.NgayCapNhat, locale)}</strong>
                                </div>
                                <div className="admin-users-profile-meta-item">
                                    <span>{t('admin.companiesPage.detail.deletedAt')}</span>
                                    <strong>{formatDateTime(company?.NgayXoa, locale)}</strong>
                                </div>
                            </div>
                        </aside>

                        <div className="admin-users-detail-panels">
                            <section className="admin-users-section-card">
                                <h6 className="mb-2 d-flex align-items-center gap-2">
                                    <Building2 size={16} />
                                    {t('admin.companiesPage.detail.companyInfo')}
                                </h6>
                                <div className="admin-company-view-grid">
                                    <article className="admin-company-view-field admin-company-view-field-span-2">
                                        <span>{t('admin.companiesPage.detail.companyName')}</span>
                                        <strong>{company?.TenCongTy || '-'}</strong>
                                    </article>
                                    <article className="admin-company-view-field">
                                        <span>{t('admin.companiesPage.detail.taxCode')}</span>
                                        <strong>{company?.MaSoThue || '-'}</strong>
                                    </article>
                                    <article className="admin-company-view-field">
                                        <span>{t('admin.companiesPage.detail.field')}</span>
                                        <strong>{company?.LinhVuc || '-'}</strong>
                                    </article>
                                    <article className="admin-company-view-field">
                                        <span>{t('admin.companiesPage.headers.city')}</span>
                                        <strong>{company?.ThanhPho || '-'}</strong>
                                    </article>
                                    <article className="admin-company-view-field">
                                        <span>{t('admin.companiesPage.detail.address')}</span>
                                        <strong>{company?.DiaChi || '-'}</strong>
                                    </article>
                                    <article className="admin-company-view-field admin-company-view-field-span-2">
                                        <span>{t('admin.companiesPage.headers.website')}</span>
                                        {websiteHref ? (
                                            <a
                                                href={websiteHref}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="admin-company-view-link"
                                            >
                                                {company?.Website || websiteHref}
                                            </a>
                                        ) : (
                                            <strong>-</strong>
                                        )}
                                    </article>
                                </div>
                            </section>

                            <section className="admin-users-section-card">
                                <h6 className="mb-2 d-flex align-items-center gap-2">
                                    <MapPin size={16} />
                                    {t('admin.companiesPage.detail.representative')}
                                </h6>
                                <div className="admin-company-view-grid">
                                    <article className="admin-company-view-field">
                                        <span>{t('admin.companiesPage.detail.repName')}</span>
                                        <strong>{company?.TenNguoiDaiDien || '-'}</strong>
                                    </article>
                                    <article className="admin-company-view-field">
                                        <span>{t('admin.companiesPage.detail.repEmail')}</span>
                                        <strong>{company?.EmailDaiDien || '-'}</strong>
                                    </article>
                                    <article className="admin-company-view-field">
                                        <span>{t('admin.companiesPage.detail.repStatus')}</span>
                                        <strong>{getCompanyStatusLabel(company?.TrangThaiDaiDien, t)}</strong>
                                    </article>
                                    <article className="admin-company-view-field">
                                        <span>{t('admin.companiesPage.detail.lastUpdated')}</span>
                                        <strong>{formatDateTime(company?.NgayCapNhat, locale)}</strong>
                                    </article>
                                </div>
                            </section>

                            {company?.MoTa ? (
                                <section className="admin-users-section-card">
                                    <h6 className="mb-2 d-flex align-items-center gap-2">
                                        <CalendarDays size={16} />
                                        {t('admin.companiesPage.detail.description')}
                                    </h6>
                                    <div className="admin-users-note-box">
                                        <div>{company.MoTa}</div>
                                    </div>
                                </section>
                            ) : null}
                        </div>
                    </div>

                    <div className="admin-company-view-actions">
                            {softDeleteMeta ? (
                                <small className={`me-auto ${softDeleteMeta.isExpired ? 'text-danger' : 'text-muted'}`}>
                                    {softDeleteMeta.isExpired
                                        ? t('admin.companiesPage.softDelete.expiredHint')
                                        : t('admin.companiesPage.softDelete.remainingHint', { time: formatSoftDeleteRemaining(softDeleteMeta.remainingMs, t) })}
                                </small>
                            ) : <span className="me-auto" />}
                        {websiteHref ? (
                            <a
                                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                                href={websiteHref}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Globe size={14} />
                                    <span>{t('admin.companiesPage.actions.openWebsite')}</span>
                            </a>
                        ) : null}
                        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                            {t('common.close')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminCompanyRow = ({
    company,
    onView,
    onSaveStatus,
    onDeleteOrRestore,
    canEdit,
    busy,
    error,
    displayIndex,
    nowTick
}) => {
    const { t, i18n } = useTranslation();
    const locale = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase().startsWith('en')
        ? 'en-US'
        : 'vi-VN';
    const websiteHref = normalizeWebsiteUrl(company?.Website);
    const status = Number(company?.TrangThaiDaiDien ?? 1);
    const isDeleted = isCompanySoftDeleted(company);
    const softDeleteMeta = getSoftDeleteMeta(company, nowTick);
    const disableStatusToggle = !canEdit || busy || isDeleted;

    const save = async (nextStatus = status) => {
        if (disableStatusToggle) return;
        await onSaveStatus(nextStatus);
    };

    return (
        <tr>
            <td>{displayIndex}</td>
            <td className="fw-semibold">{company.TenCongTy}</td>
            <td>{company.MaSoThue || '-'}</td>
            <td>{company.ThanhPho || '-'}</td>
            <td>
                {websiteHref ? (
                    <a href={websiteHref} target="_blank" rel="noreferrer">{company.Website}</a>
                ) : '-'}
            </td>
            <td className="admin-status-col">
                {renderCompanyStatusBadge(company, t, nowTick)}
            </td>
            <td>
                <div>{formatDateTime(company?.NgayXoa, locale)}</div>
                {softDeleteMeta ? (
                    <small className={`d-block mt-1 ${softDeleteMeta.isExpired ? 'text-danger' : 'text-muted'}`}>
                        {softDeleteMeta.isExpired
                            ? t('admin.companiesPage.softDelete.expiredHint')
                            : t('admin.companiesPage.softDelete.remainingHint', { time: formatSoftDeleteRemaining(softDeleteMeta.remainingMs, t) })}
                    </small>
                ) : null}
            </td>
            <td className="admin-action-col">
                <div className="admin-row-actions">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-primary admin-action-icon-btn"
                        onClick={onView}
                        title={t('admin.companiesPage.actions.view')}
                        aria-label={t('admin.companiesPage.actions.view')}
                    >
                        <Eye size={14} />
                    </button>
                    {status === 1 ? (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-warning admin-action-icon-btn"
                            disabled={disableStatusToggle}
                            onClick={() => save(0)}
                            title={t('admin.companiesPage.actions.block')}
                            aria-label={t('admin.companiesPage.actions.block')}
                        >
                            <Ban size={14} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-success admin-action-icon-btn"
                            disabled={disableStatusToggle}
                            onClick={() => save(1)}
                            title={t('admin.companiesPage.actions.unblock')}
                            aria-label={t('admin.companiesPage.actions.unblock')}
                        >
                            <ShieldCheck size={14} />
                        </button>
                    )}
                    <button
                        type="button"
                        className={`btn btn-sm admin-action-icon-btn ${isDeleted ? 'btn-outline-success' : 'btn-outline-danger'}`}
                        disabled={!canEdit || busy}
                        onClick={onDeleteOrRestore}
                        title={isDeleted ? t('admin.companiesPage.actions.restore') : t('admin.companiesPage.actions.delete')}
                        aria-label={isDeleted ? t('admin.companiesPage.actions.restore') : t('admin.companiesPage.actions.delete')}
                    >
                        {isDeleted ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                    </button>
                </div>
                {error ? <div className="text-danger small mt-1">{error}</div> : null}
            </td>
        </tr>
    );
};

const AdminCompaniesPage = ({
    companies,
    pagination,
    loading,
    canEdit,
    requestConfirm,
    onRangeChange,
    onSaveCompanyStatus,
    onDeleteCompany,
    onRestoreCompany
}) => {
    const { t } = useTranslation();
    const [rowBusyId, setRowBusyId] = useState(null);
    const [rowErrors, setRowErrors] = useState({});
    const [nowTick, setNowTick] = useState(Date.now());
    const [viewingCompany, setViewingCompany] = useState(null);

    const totalItems = Math.max(0, Number(pagination?.total) || companies.length || 0);
    const perPage = Math.max(1, Number(pagination?.limit) || 10);
    const fromDisplay = totalItems > 0 ? Math.max(1, Number(pagination?.from) || 1) : 0;
    const toDisplay = totalItems > 0
        ? Math.max(fromDisplay, Math.min(totalItems, Number(pagination?.to) || (fromDisplay + companies.length - 1)))
        : 0;

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNowTick(Date.now());
        }, 30000);

        return () => window.clearInterval(timer);
    }, []);

    const setRowError = (companyId, message) => {
        setRowErrors((prev) => ({ ...prev, [companyId]: message }));
    };

    const clearRowError = (companyId) => {
        setRowErrors((prev) => {
            if (!prev[companyId]) return prev;
            const next = { ...prev };
            delete next[companyId];
            return next;
        });
    };

    const handleSaveStatus = async (company, status) => {
        const companyId = company?.MaCongTy;
        if (!Number.isFinite(Number(companyId))) return;

        setRowBusyId(companyId);
        clearRowError(companyId);
        try {
            await onSaveCompanyStatus(companyId, status);
        } catch (error) {
            setRowError(companyId, error?.message || t('admin.companiesPage.messages.genericError'));
        } finally {
            setRowBusyId(null);
        }
    };

    const handleDeleteOrRestore = async (company) => {
        const companyId = company?.MaCongTy;
        if (!Number.isFinite(Number(companyId))) return;
        if (typeof requestConfirm !== 'function') return;

        const deleted = isCompanySoftDeleted(company);
        const approved = await requestConfirm({
            title: deleted ? t('admin.companiesPage.confirm.restoreTitle') : t('admin.companiesPage.confirm.deleteTitle'),
            message: deleted
                ? t('admin.companiesPage.confirm.restoreMessage', { name: company?.TenCongTy || '-' })
                : t('admin.companiesPage.confirm.deleteMessage', { name: company?.TenCongTy || '-' }),
            confirmText: deleted ? t('admin.companiesPage.confirm.restoreButton') : t('admin.companiesPage.confirm.deleteButton'),
            cancelText: t('common.cancel')
        });

        if (!approved) return;

        setRowBusyId(companyId);
        clearRowError(companyId);
        try {
            if (deleted) {
                if (typeof onRestoreCompany !== 'function') {
                    throw new Error(t('admin.companiesPage.messages.missingRestoreHandler'));
                }
                await onRestoreCompany(companyId);
            } else {
                await onDeleteCompany(companyId);
            }
        } catch (error) {
            setRowError(companyId, error?.message || t('admin.companiesPage.messages.genericError'));
        } finally {
            setRowBusyId(null);
        }
    };

    return (
        <>
            <div className="card border-0 shadow-sm admin-module-card mb-4">
                <div className="card-header bg-white border-0 py-3">
                    <h5 className="mb-0 d-flex align-items-center gap-2">
                        <Building2 size={18} />
                        <span>{t('admin.companiesPage.title')}</span>
                    </h5>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th style={{ width: 90 }}>{t('admin.companiesPage.headers.id')}</th>
                                <th>{t('admin.companiesPage.headers.name')}</th>
                                <th style={{ width: 170 }}>{t('admin.companiesPage.headers.taxCode')}</th>
                                <th style={{ width: 140 }}>{t('admin.companiesPage.headers.city')}</th>
                                <th style={{ width: 220 }}>{t('admin.companiesPage.headers.website')}</th>
                                <th style={{ width: 150 }} className="admin-status-col">{t('admin.companiesPage.headers.status')}</th>
                                <th style={{ width: 220 }}>{t('admin.companiesPage.headers.deletedAt')}</th>
                                <th style={{ width: 240 }} className="admin-action-col">{t('admin.companiesPage.headers.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {companies.map((c, index) => (
                                <AdminCompanyRow
                                    key={c.MaCongTy}
                                    company={c}
                                    displayIndex={fromDisplay + index}
                                    canEdit={canEdit}
                                    busy={rowBusyId === c.MaCongTy}
                                    error={rowErrors[c.MaCongTy] || ''}
                                    nowTick={nowTick}
                                    onView={() => setViewingCompany(c)}
                                    onSaveStatus={(status) => handleSaveStatus(c, status)}
                                    onDeleteOrRestore={() => handleDeleteOrRestore(c)}
                                />
                            ))}
                            {companies.length === 0 && !loading && (
                                <tr><td colSpan={8} className="text-center text-muted py-4">{t('admin.companiesPage.empty')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalItems > 0 ? (
                    <div className="d-flex justify-content-end p-3 border-top bg-white">
                        <SmartPagination
                            from={fromDisplay}
                            to={toDisplay}
                            pageSize={perPage}
                            perPage={perPage}
                            totalItems={totalItems}
                            loading={loading}
                            onRangeChange={(nextFrom, nextTo) => {
                                if (typeof onRangeChange === 'function') {
                                    onRangeChange(nextFrom, nextTo);
                                }
                            }}
                        />
                    </div>
                ) : null}
            </div>

            {viewingCompany ? (
                <AdminCompanyDetailModal
                    company={viewingCompany}
                    nowTick={nowTick}
                    onClose={() => setViewingCompany(null)}
                />
            ) : null}
        </>
    );
};

export default AdminCompaniesPage;
