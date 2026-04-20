import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sanitizeCareerHtml } from '../../career-guide/richTextUtils';

const formatCurrencyVnd = (value) => {
    if (value === null || value === undefined) return '';
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return new Intl.NumberFormat('vi-VN').format(num);
};

const JobDetail = () => {
    const { t, i18n } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const token = useMemo(() => localStorage.getItem('token') || '', []);
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en-US' : 'vi-VN';

    const formatDate = (value) => {
        if (!value) return t('employer.jobDetailPage.noData');
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return t('employer.jobDetailPage.noData');
        return new Intl.DateTimeFormat(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    };

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await fetch(`/jobs/${id}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || t('employer.jobDetailPage.errorLoading'));
                if (!cancelled) setJob(data);
            } catch (err) {
                if (!cancelled) setError(err.message || t('employer.jobDetailPage.errorLoading'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [id, token, t]);

    const renderRich = (html) => (
        <div
            className="job-detail-rich-block"
            style={{ minHeight: 80 }}
            dangerouslySetInnerHTML={{ __html: sanitizeCareerHtml(html || '') || `<em>${t('employer.jobDetailPage.noData')}</em>` }}
        />
    );

    const jobSkills = useMemo(() => {
        const source = Array.isArray(job?.skills) ? job.skills : [];
        return source
            .map((item) => {
                const name = typeof item === 'string'
                    ? String(item).trim()
                    : String(item?.name || item?.TenKyNang || '').trim();
                const importanceRaw = typeof item === 'string'
                    ? 1
                    : Number(item?.importance ?? item?.DoQuanTrong ?? 1);
                const importance = Number.isFinite(importanceRaw)
                    ? Math.max(1, Math.min(5, Math.round(importanceRaw)))
                    : 1;
                return { name, importance };
            })
            .filter((item) => item.name)
            .slice(0, 16);
    }, [job?.skills]);

    return (
        <div className="job-detail-page">
            <div className="job-detail-hero">
                <div className="job-detail-hero__content container">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
                        <div>
                            <button className="btn btn-link p-0 mb-2" onClick={() => navigate(-1)}>
                                {t('employer.jobDetailPage.backButton')}
                            </button>
                            <h2 className="job-detail-title mb-0">{t('employer.jobDetailPage.title')}</h2>
                        </div>
                        <div className="job-detail-actions d-flex gap-2">
                            <Link to={`/employer/jobs/${id}/edit`} className="btn btn-primary">
                                {t('employer.jobDetailPage.editButton')}
                            </Link>
                            <Link to="/employer/jobs" className="btn btn-outline-secondary">
                                {t('employer.jobDetailPage.jobListButton')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="job-detail-body container">
                {error && <div className="alert alert-danger">{error}</div>}
                {loading && <p className="text-muted">{t('employer.jobDetailPage.loading')}</p>}
                {!loading && job && (
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-3">
                                <div>
                                    <h4 className="mb-1">{job.TieuDe}</h4>
                                    <div className="text-muted">
                                        {[job.DiaDiem, job.ThanhPho].filter(Boolean).join(', ') || t('employer.jobDetailPage.noData')}
                                    </div>
                                </div>
                                <span className={`badge ${job.TrangThai === 'Published' || job.TrangThai === 'Đã đăng' ? 'bg-success' : 'bg-secondary'}`}>
                                    {job.TrangThai || t('employer.jobDetailPage.noData')}
                                </span>
                            </div>

                            <div className="row g-3 mb-3">
                                <div className="col-md-6">
                                    <strong>{t('employer.jobDetailPage.fields.salaryType')}:</strong> {job.KieuLuong || t('employer.jobDetailPage.noData')}
                                </div>
                                <div className="col-md-6">
                                    <strong>{t('employer.jobDetailPage.fields.employmentType')}:</strong> {job.HinhThuc || t('employer.jobDetailPage.noData')}
                                </div>
                                <div className="col-md-6">
                                    <strong>{t('employer.jobDetailPage.fields.salaryFrom')}:</strong> {formatCurrencyVnd(job.LuongTu) || t('employer.jobDetailPage.noData')}
                                </div>
                                <div className="col-md-6">
                                    <strong>{t('employer.jobDetailPage.fields.salaryTo')}:</strong> {formatCurrencyVnd(job.LuongDen) || t('employer.jobDetailPage.noData')}
                                </div>
                                <div className="col-md-6">
                                    <strong>{t('employer.jobDetailPage.fields.postedDate')}:</strong> {formatDate(job.NgayDang)}
                                </div>
                                <div className="col-md-6">
                                    <strong>{t('employer.jobDetailPage.fields.deadline')}:</strong> {formatDate(job.HanNopHoSo)}
                                </div>
                            </div>

                            <div className="mb-3">
                                <h6 className="fw-semibold">{t('employer.jobDetailPage.fields.description')}</h6>
                                {renderRich(job.MoTa)}
                            </div>
                            <div className="mb-3">
                                <h6 className="fw-semibold">{t('employer.jobDetailPage.fields.requirements')}</h6>
                                {renderRich(job.YeuCau)}
                            </div>
                            {jobSkills.length > 0 ? (
                                <div className="mb-3">
                                    <h6 className="fw-semibold">{t('employer.jobDetailPage.fields.skills', { defaultValue: 'Kỹ năng yêu cầu' })}</h6>
                                    <div className="job-detail-skills">
                                        {jobSkills.map((skill, index) => (
                                            <span key={`${skill.name}-${index}`} className="job-detail-skill-chip">
                                                <span>{skill.name}</span>
                                                {skill.importance > 1 ? <small>Ưu tiên {skill.importance}/5</small> : null}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                            <div>
                                <h6 className="fw-semibold">{t('employer.jobDetailPage.fields.benefits')}</h6>
                                {renderRich(job.QuyenLoi)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobDetail;
