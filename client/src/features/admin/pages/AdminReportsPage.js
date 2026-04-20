import React, { useState } from 'react';
import { CheckCircle2, ClipboardList, EyeOff, Lock, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const formatDateTime = (value, locale) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString(locale);
};

const toText = (value) => String(value || '').trim();

const shortText = (value, maxLen = 120) => {
    const text = toText(value);
    if (!text) return '-';
    if (text.length <= maxLen) return text;
    return `${text.slice(0, maxLen)}...`;
};

const formatCode = (prefix, value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '-';
    return `${prefix}-${raw}`;
};

const normalizeStatusClass = (status) => {
    const text = toText(status).toLowerCase();
    if (!text) return 'neutral';
    if (text.includes('đã xử lý') || text.includes('duyệt') || text.includes('approved') || text.includes('processed')) return 'success';
    if (text.includes('đang') || text.includes('pending')) return 'warning';
    if (text.includes('từ chối') || text.includes('rejected')) return 'danger';
    return 'neutral';
};

const getStatusLabel = (status, t) => {
    const text = toText(status);
    const normalized = text.toLowerCase();

    if (!text) return t('admin.reportsPage.status.unprocessed');
    if (normalized.includes('đã xử lý') || normalized.includes('duyệt') || normalized.includes('approved') || normalized.includes('processed')) {
        return t('admin.reportsPage.status.approved');
    }
    if (normalized.includes('đang') || normalized.includes('pending')) {
        return t('admin.reportsPage.status.pending');
    }
    if (normalized.includes('từ chối') || normalized.includes('rejected')) {
        return t('admin.reportsPage.status.rejected');
    }
    return text;
};

const getTargetTypeLabel = (value, t) => {
    const text = toText(value);
    const normalized = text.toLowerCase();

    if (!text) return '-';
    if (normalized.includes('job') || normalized.includes('tin')) return t('admin.reportsPage.targetTypeLabels.job');
    if (normalized.includes('company') || normalized.includes('congty')) return t('admin.reportsPage.targetTypeLabels.company');
    if (normalized.includes('user') || normalized.includes('nguoidung')) return t('admin.reportsPage.targetTypeLabels.user');
    if (normalized.includes('post') || normalized.includes('baiviet') || normalized.includes('guide')) return t('admin.reportsPage.targetTypeLabels.post');
    if (normalized.includes('comment') || normalized.includes('binhluan')) return t('admin.reportsPage.targetTypeLabels.comment');
    return text;
};

const AdminReportsPage = ({ reports, loading, onApproveReport, onDeleteReport, requestConfirm }) => {
    const { t, i18n } = useTranslation();
    const currentLocale = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase().startsWith('en')
        ? 'en-US'
        : 'vi-VN';

    const [activeReport, setActiveReport] = useState(null);
    const [hideContent, setHideContent] = useState(true);
    const [lockEntity, setLockEntity] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [modalError, setModalError] = useState('');

    const openApproveModal = (report) => {
        setActiveReport(report);
        setHideContent(true);
        setLockEntity(false);
        setModalError('');
    };

    const closeApproveModal = () => {
        if (processing) return;
        setActiveReport(null);
        setHideContent(true);
        setLockEntity(false);
        setModalError('');
    };

    const confirmDeleteReport = async (report) => {
        const reportId = Number(report?.MaBaoCao);
        if (!Number.isFinite(reportId)) return;

        let approved = false;
        if (typeof requestConfirm === 'function') {
            approved = await requestConfirm({
                title: t('admin.reportsPage.confirmDeleteTitle'),
                message: t('admin.reportsPage.confirmDeleteMessage', { id: reportId }),
                confirmText: t('common.delete'),
                cancelText: t('common.cancel')
            });
        } else {
            approved = window.confirm(t('admin.reportsPage.confirmDeleteMessageSimple', { id: reportId }));
        }

        if (!approved) return;

        setDeletingId(reportId);
        try {
            await onDeleteReport(reportId);
        } finally {
            setDeletingId(null);
        }
    };

    const submitApproveReport = async () => {
        const reportId = Number(activeReport?.MaBaoCao);
        if (!Number.isFinite(reportId)) return;

        setProcessing(true);
        setModalError('');
        try {
            await onApproveReport(reportId, {
                hideContent,
                lockEntity
            });
            closeApproveModal();
        } catch (err) {
            setModalError(err?.message || t('admin.reportsPage.approveError'));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <>
            <div className="card border-0 shadow-sm admin-module-card">
                <div className="card-header bg-white border-0 py-3">
                    <h5 className="mb-0 d-flex align-items-center gap-2">
                        <ClipboardList size={18} />
                        <span>{t('admin.reportsPage.title')}</span>
                    </h5>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th style={{ width: 90 }}>{t('admin.reportsPage.columns.id')}</th>
                                <th style={{ width: 125 }}>{t('admin.reportsPage.columns.reporter')}</th>
                                <th style={{ width: 180 }}>{t('admin.reportsPage.columns.targetType')}</th>
                                <th style={{ width: 125 }}>{t('admin.reportsPage.columns.target')}</th>
                                <th style={{ width: 210 }}>{t('admin.reportsPage.columns.reason')}</th>
                                <th>{t('admin.reportsPage.columns.detail')}</th>
                                <th style={{ width: 140 }}>{t('admin.reportsPage.columns.status')}</th>
                                <th style={{ width: 190 }}>{t('admin.reportsPage.columns.reportedAt')}</th>
                                <th style={{ width: 110 }}>{t('admin.reportsPage.columns.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report, index) => (
                                <tr key={report.MaBaoCao}>
                                    <td>{index + 1}</td>
                                    <td><span className="admin-code-chip">{formatCode('NB', report.MaNguoiBaoCao)}</span></td>
                                    <td>{getTargetTypeLabel(report.LoaiDoiTuong, t)}</td>
                                    <td><span className="admin-code-chip">{formatCode('DT', report.MaDoiTuong)}</span></td>
                                    <td>{shortText(report.LyDo, 70)}</td>
                                    <td className="admin-report-detail-cell">{shortText(report.ChiTiet, 150)}</td>
                                    <td>
                                        <span className={`admin-report-status ${normalizeStatusClass(report.TrangThai)}`}>
                                            {getStatusLabel(report.TrangThai, t)}
                                        </span>
                                    </td>
                                    <td>{formatDateTime(report.NgayBaoCao, currentLocale)}</td>
                                    <td>
                                        <div className="admin-report-row-actions">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-primary admin-icon-action-btn"
                                                title={t('admin.reportsPage.actions.approve')}
                                                aria-label={t('admin.reportsPage.actions.approve')}
                                                onClick={() => openApproveModal(report)}
                                                disabled={processing || deletingId === report.MaBaoCao}
                                            >
                                                <CheckCircle2 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger admin-icon-action-btn"
                                                title={t('admin.reportsPage.actions.deleteReport')}
                                                aria-label={t('admin.reportsPage.actions.deleteReport')}
                                                onClick={() => confirmDeleteReport(report)}
                                                disabled={processing || deletingId === report.MaBaoCao}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {reports.length === 0 && !loading && (
                                <tr><td colSpan={9} className="text-center text-muted py-4">{t('admin.reportsPage.empty')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {activeReport ? (
                <div className="admin-confirm-backdrop" role="dialog" aria-modal="true">
                    <div className="admin-report-modal card border-0 shadow-sm">
                        <div className="admin-report-modal-header">
                            <h5 className="mb-0">{t('admin.reportsPage.modal.title', { id: activeReport.MaBaoCao })}</h5>
                            <button
                                type="button"
                                className="admin-users-close-btn"
                                onClick={closeApproveModal}
                                aria-label={t('common.close')}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="card-body">
                            <div className="admin-report-detail-grid">
                                <div className="admin-report-detail-item">
                                    <span>{t('admin.reportsPage.modal.reporterCode')}</span>
                                    <strong>{formatCode('NB', activeReport.MaNguoiBaoCao)}</strong>
                                </div>
                                <div className="admin-report-detail-item">
                                    <span>{t('admin.reportsPage.modal.reporterEmail')}</span>
                                    <strong>{toText(activeReport.EmailNguoiBaoCao) || '-'}</strong>
                                </div>
                                <div className="admin-report-detail-item">
                                    <span>{t('admin.reportsPage.columns.targetType')}</span>
                                    <strong>{getTargetTypeLabel(activeReport.LoaiDoiTuong, t)}</strong>
                                </div>
                                <div className="admin-report-detail-item">
                                    <span>{t('admin.reportsPage.modal.targetCode')}</span>
                                    <strong>{formatCode('DT', activeReport.MaDoiTuong)}</strong>
                                </div>
                                <div className="admin-report-detail-item">
                                    <span>{t('admin.reportsPage.columns.reason')}</span>
                                    <strong>{toText(activeReport.LyDo) || '-'}</strong>
                                </div>
                                <div className="admin-report-detail-item">
                                    <span>{t('admin.reportsPage.columns.reportedAt')}</span>
                                    <strong>{formatDateTime(activeReport.NgayBaoCao, currentLocale)}</strong>
                                </div>
                            </div>

                            <div className="admin-report-content-box mt-3">
                                <span>{t('admin.reportsPage.modal.detailTitle')}</span>
                                <p>{toText(activeReport.ChiTiet) || t('admin.reportsPage.modal.noDetail')}</p>
                            </div>

                            <div className="admin-report-toggle-grid mt-3">
                                <label className={`admin-report-toggle ${hideContent ? 'active' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={hideContent}
                                        onChange={(event) => setHideContent(event.target.checked)}
                                        disabled={processing}
                                    />
                                    <EyeOff size={15} />
                                    <span>{t('admin.reportsPage.modal.hideTargetContent')}</span>
                                </label>

                                <label className={`admin-report-toggle ${lockEntity ? 'active' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={lockEntity}
                                        onChange={(event) => setLockEntity(event.target.checked)}
                                        disabled={processing}
                                    />
                                    <Lock size={15} />
                                    <span>{t('admin.reportsPage.modal.lockTarget')}</span>
                                </label>
                            </div>

                            {modalError ? <div className="alert alert-danger mt-3 mb-0">{modalError}</div> : null}

                            <div className="d-flex justify-content-end gap-2 mt-4">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={closeApproveModal}
                                    disabled={processing}
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={submitApproveReport}
                                    disabled={processing}
                                >
                                    {processing ? t('admin.reportsPage.modal.processing') : t('admin.reportsPage.actions.approve')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
};

export default AdminReportsPage;
