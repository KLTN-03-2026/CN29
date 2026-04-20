import React, { useState } from 'react';
import { BriefcaseBusiness, ExternalLink, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const normalizeStatusType = (status) => {
    const normalized = String(status || '').trim().toLowerCase();

    if (!normalized) return 'draft';
    if (normalized === 'đã đăng' || normalized === 'published') return 'posted';
    if (normalized === 'đã đóng' || normalized === 'closed') return 'closed';
    if (normalized === 'lưu trữ' || normalized === 'archived') return 'archived';
    if (normalized === 'nháp' || normalized === 'draft') return 'draft';
    return 'unknown';
};

const getStatusBadgeClass = (statusType) => {
    if (statusType === 'posted') return 'bg-success-subtle text-success border border-success-subtle';
    if (statusType === 'closed') return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
    if (statusType === 'archived') return 'bg-dark-subtle text-secondary border border-secondary-subtle';
    if (statusType === 'draft') return 'bg-info-subtle text-info-emphasis border border-info-subtle';
    return 'bg-secondary-subtle text-secondary border border-secondary-subtle';
};

const AdminJobRow = ({ job, onDelete, canDelete, requestConfirm, displayIndex, t }) => {
    const statusRaw = String(job.TrangThai || '').trim();
    const statusType = normalizeStatusType(statusRaw);
    const statusLabel = statusType === 'unknown'
        ? (statusRaw || t('admin.jobsPage.status.unknown'))
        : t(`admin.jobsPage.status.${statusType}`);
    const jobId = job?.MaTin != null ? String(job.MaTin).trim() : '';
    const publicJobUrl = jobId ? `/jobs/${encodeURIComponent(jobId)}` : '';
    const [deleting, setDeleting] = useState(false);
    const [err, setErr] = useState('');

    const handleDelete = async () => {
        if (!canDelete) return;
        const ok = await requestConfirm({
            title: t('admin.jobsPage.confirmDeleteTitle'),
            message: t('admin.jobsPage.confirmDeleteMessage'),
            confirmText: t('common.delete')
        });
        if (!ok) return;
        setDeleting(true);
        setErr('');
        try {
            await onDelete();
        } catch (e) {
            setErr(e?.message || t('admin.jobsPage.errorFallback'));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <tr>
            <td>{displayIndex}</td>
            <td className="fw-semibold">{job.TieuDe}</td>
            <td>{job.TenCongTy || '-'}</td>
            <td>{job.ThanhPho || '-'}</td>
            <td className="admin-status-col">
                <span className={`badge ${getStatusBadgeClass(statusType)}`}>{statusLabel}</span>
            </td>
            <td className="admin-action-col">
                <div className="admin-row-actions">
                    {publicJobUrl ? (
                        <a
                            className="btn btn-sm btn-outline-primary admin-action-icon-btn"
                            href={publicJobUrl}
                            target="_blank"
                            rel="noreferrer"
                            title={t('admin.jobsPage.actions.viewPostedJob')}
                            aria-label={t('admin.jobsPage.actions.viewPostedJob')}
                        >
                            <ExternalLink size={14} />
                        </a>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary admin-action-icon-btn"
                            disabled
                            title={t('admin.jobsPage.actions.missingJobId')}
                            aria-label={t('admin.jobsPage.actions.missingJobId')}
                        >
                            <ExternalLink size={14} />
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger admin-action-icon-btn"
                        disabled={!canDelete || deleting}
                        onClick={handleDelete}
                        title={t('admin.jobsPage.actions.deleteJob')}
                        aria-label={t('admin.jobsPage.actions.deleteJob')}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
                {err ? <div className="text-danger small mt-1">{err}</div> : null}
            </td>
        </tr>
    );
};

const AdminJobsPage = ({ jobs, loading, canDelete, requestConfirm, onDeleteJob }) => {
    const { t } = useTranslation();

    return (
        <div className="card border-0 shadow-sm admin-module-card mb-4">
            <div className="card-header bg-white border-0 py-3">
                <h5 className="mb-0 d-flex align-items-center gap-2">
                    <BriefcaseBusiness size={18} />
                    <span>{t('admin.jobsPage.title')}</span>
                </h5>
            </div>
            <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th style={{ width: 90 }}>{t('admin.jobsPage.columns.id')}</th>
                            <th>{t('admin.jobsPage.columns.title')}</th>
                            <th style={{ width: 200 }}>{t('admin.jobsPage.columns.company')}</th>
                            <th style={{ width: 140 }}>{t('admin.jobsPage.columns.city')}</th>
                            <th style={{ width: 170 }} className="admin-status-col">{t('admin.jobsPage.columns.status')}</th>
                            <th style={{ width: 220 }} className="admin-action-col">{t('admin.jobsPage.columns.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map((j, index) => (
                            <AdminJobRow
                                key={j.MaTin}
                                job={j}
                                displayIndex={index + 1}
                                requestConfirm={requestConfirm}
                                onDelete={() => onDeleteJob(j.MaTin)}
                                canDelete={canDelete}
                                t={t}
                            />
                        ))}
                        {jobs.length === 0 && !loading && (
                            <tr><td colSpan={6} className="text-center text-muted py-4">{t('admin.jobsPage.empty')}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminJobsPage;
