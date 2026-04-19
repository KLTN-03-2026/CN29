import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useNotification } from '../../../components/NotificationProvider';
import SmartPagination from '../../../components/SmartPagination';

const PAGE_SIZE = 10;

const JobManagement = () => {
    const { t } = useTranslation();
    const { requestConfirm } = useNotification();
    const location = useLocation();
    const token = useMemo(() => localStorage.getItem('token') || '', []);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingJobId, setDeletingJobId] = useState(null);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const flash = location.state?.flash;

    const totalJobs = jobs.length;
    const totalPages = Math.max(1, Math.ceil(totalJobs / PAGE_SIZE));
    const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);

    const pagedJobs = useMemo(() => {
        const offset = (safeCurrentPage - 1) * PAGE_SIZE;
        return jobs.slice(offset, offset + PAGE_SIZE);
    }, [jobs, safeCurrentPage]);

    const formatPostedDate = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const rangeFrom = totalJobs === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
    const rangeTo = totalJobs === 0 ? 0 : Math.min(safeCurrentPage * PAGE_SIZE, totalJobs);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await fetch('/jobs/mine', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const data = await res.json().catch(() => ([]));
                if (!res.ok) {
                    throw new Error(data.error || 'Không thể tải danh sách tin tuyển dụng.');
                }
                if (!cancelled) setJobs(Array.isArray(data) ? data : []);
            } catch (err) {
                if (!cancelled) setError(err.message || 'Có lỗi xảy ra.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [token]);

    useEffect(() => {
        if (currentPage !== safeCurrentPage) {
            setCurrentPage(safeCurrentPage);
        }
    }, [currentPage, safeCurrentPage]);

    const handleDeleteJob = async (job) => {
        const jobId = Number(job?.MaTin || 0);
        if (!jobId) return;

        const confirmed = await requestConfirm({
            type: 'warning',
            title: t('employer.jobManagementPage.confirm.title'),
            message: t('employer.jobManagementPage.confirm.deleteJob'),
            confirmText: t('common.delete'),
            cancelText: t('common.cancel')
        });
        if (!confirmed) return;

        setDeletingJobId(jobId);
        setError('');

        try {
            const res = await fetch(`/jobs/${jobId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Không thể xóa tin tuyển dụng.');
            }

            setJobs((prev) => prev.filter((item) => Number(item.MaTin) !== jobId));
        } catch (err) {
            setError(err.message || 'Không thể xóa tin tuyển dụng.');
        } finally {
            setDeletingJobId(null);
        }
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0 employer-page-title">{t('employer.jobManagementPage.title')}</h2>
                <Link to="/employer/jobs/create" className="btn btn-primary">
                    <i className="bi bi-plus-circle me-2"></i>
                    {t('employer.jobManagementPage.createJob')}
                </Link>
            </div>

            {flash && (
                <div className="alert alert-success" role="alert">
                    {flash}
                </div>
            )}

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            <div className="card border-0 shadow-sm">
                <div className="card-body">
                    {loading ? (
                        <p className="text-muted text-center py-5 mb-0">{t('employer.jobManagementPage.loading')}</p>
                    ) : jobs.length === 0 ? (
                        <p className="text-muted text-center py-5 mb-0">
                            {t('employer.jobManagementPage.emptyTitle')} <br />
                            {t('employer.jobManagementPage.emptyHint')}
                        </p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th>{t('employer.jobManagementPage.table.title')}</th>
                                        <th>{t('employer.jobManagementPage.table.location')}</th>
                                        <th>{t('employer.jobManagementPage.table.status')}</th>
                                        <th>{t('employer.jobManagementPage.table.postedDate')}</th>
                                        <th className="text-end">{t('employer.jobManagementPage.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedJobs.map((j) => (
                                        <tr key={j.MaTin}>
                                            <td className="fw-semibold">{j.TieuDe}</td>
                                            <td>{[j.DiaDiem, j.ThanhPho].filter(Boolean).join(', ') || '-'}</td>
                                            <td>
                                                <span className={`badge ${j.TrangThai === 'Đã đăng' ? 'bg-success' : 'bg-secondary'}`}>
                                                    {j.TrangThai}
                                                </span>
                                            </td>
                                            <td>{formatPostedDate(j.NgayDang)}</td>
                                            <td className="text-end">
                                                <div className="job-manage-row-actions">
                                                    <Link
                                                        to={`/employer/jobs/${j.MaTin}`}
                                                        className="btn btn-outline-secondary btn-sm job-manage-action-icon"
                                                        title={t('employer.jobManagementPage.buttons.viewDetails')}
                                                        aria-label={t('employer.jobManagementPage.buttons.viewDetails')}
                                                    >
                                                        <i className="bi bi-eye"></i>
                                                    </Link>
                                                    <Link
                                                        to={`/employer/jobs/${j.MaTin}/edit`}
                                                        className="btn btn-outline-primary btn-sm job-manage-action-icon"
                                                        title={t('employer.jobManagementPage.buttons.edit')}
                                                        aria-label={t('employer.jobManagementPage.buttons.edit')}
                                                    >
                                                        <i className="bi bi-pencil-square"></i>
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger btn-sm job-manage-action-icon"
                                                        title={t('employer.jobManagementPage.buttons.delete')}
                                                        aria-label={t('employer.jobManagementPage.buttons.delete')}
                                                        onClick={() => handleDeleteJob(j)}
                                                        disabled={deletingJobId === Number(j.MaTin)}
                                                    >
                                                        {deletingJobId === Number(j.MaTin) ? (
                                                            <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                                                        ) : (
                                                            <i className="bi bi-trash"></i>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && jobs.length > 0 && (
                        <div className="d-flex justify-content-end mt-3">
                            <SmartPagination
                                from={rangeFrom}
                                to={rangeTo}
                                totalItems={totalJobs}
                                currentPage={safeCurrentPage}
                                pageSize={PAGE_SIZE}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobManagement;
