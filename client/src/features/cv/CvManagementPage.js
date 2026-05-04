import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../components/NotificationProvider';
import './CvManagementPage.css';

const toDateMs = (value) => {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const formatDate = (value, locale = 'vi-VN') => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(locale);
};

const normalizeCv = (cv, index) => {
  const id = cv?.id || cv?.cvId || cv?.MaCV || cv?.MaHoSo || `cv-${index}`;
  const name = String(cv?.name || cv?.TenCV || cv?.tenCV || 'CV chưa đặt tên').trim();
  const fileUrl = String(cv?.fileUrl || cv?.FileUrl || cv?.url || '').trim();
  const fileAbsoluteUrl = String(cv?.fileAbsoluteUrl || cv?.FileAbsoluteUrl || '').trim();
  const uploadDate = cv?.uploadDate || cv?.NgayTao || cv?.createdAt || null;
  const updatedAt = cv?.updatedAt || cv?.NgayCapNhat || uploadDate || null;
  const skills = Array.isArray(cv?.skills) ? cv.skills : [];

  const previewUrl = fileAbsoluteUrl || fileUrl;
  const safeUrl = previewUrl.split('?')[0].toLowerCase();
  const isOnlineCv = safeUrl.endsWith('.html');
  const extension = safeUrl.includes('.') ? safeUrl.split('.').pop() : '';

  return {
    id,
    name,
    fileUrl,
    fileAbsoluteUrl,
    previewUrl,
    uploadDate,
    updatedAt,
    updatedMs: toDateMs(updatedAt),
    isOnlineCv,
    typeLabel: isOnlineCv ? 'CV Online' : (extension ? `File ${extension.toUpperCase()}` : 'CV tài liệu'),
    status: String(cv?.status || cv?.TrangThai || '').trim(),
    skills
  };
};

const CvManagementPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { notify, requestConfirm } = useNotification();
  const currentLocale = i18n.language?.startsWith('en') ? 'en-US' : 'vi-VN';

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const userId = user?.id || user?.MaNguoiDung || user?.maNguoiDung || user?.userId || user?.userID || null;

  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [rawCvs, setRawCvs] = useState([]);
  const [query, setQuery] = useState('');
  const [viewFilter, setViewFilter] = useState('all');
  const fileInputRef = useRef(null);

  const cvs = useMemo(() => {
    return rawCvs
      .map((item, index) => normalizeCv(item, index))
      .sort((a, b) => b.updatedMs - a.updatedMs);
  }, [rawCvs]);

  const stats = useMemo(() => {
    const total = cvs.length;
    const online = cvs.filter((cv) => cv.isOnlineCv).length;
    return {
      total,
      online,
      uploaded: Math.max(0, total - online)
    };
  }, [cvs]);

  const filteredCvs = useMemo(() => {
    const search = String(query || '').trim().toLowerCase();

    return cvs.filter((cv) => {
      if (viewFilter === 'online' && !cv.isOnlineCv) return false;
      if (viewFilter === 'uploaded' && cv.isOnlineCv) return false;

      if (!search) return true;
      return cv.name.toLowerCase().includes(search) || cv.typeLabel.toLowerCase().includes(search);
    });
  }, [cvs, query, viewFilter]);

  const loadCvs = async () => {
    if (!userId) {
      setRawCvs([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/cvs?userId=${encodeURIComponent(userId)}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || t('cvManagement.errors.loadList'));
      }

      setRawCvs(Array.isArray(data?.cvs) ? data.cvs : []);
    } catch (error) {
      setRawCvs([]);
      notify({ type: 'error', message: error.message || t('cvManagement.errors.loadList') });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cvId) => {
    if (!userId || !cvId) return;

    const ok = await requestConfirm({
      title: t('cvManagement.actions.deleteCv'),
      message: t('cvManagement.confirm.deleteMessage'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      intent: 'delete',
      type: 'warning'
    });
    if (!ok) return;

    setDeletingId(String(cvId));
    try {
      const response = await fetch(`/api/cvs/${encodeURIComponent(cvId)}?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || t('cvManagement.errors.deleteCv'));
      }

      setRawCvs((prev) => prev.filter((item, index) => String(normalizeCv(item, index).id) !== String(cvId)));
      notify({ type: 'success', message: t('cvManagement.notifications.deleteSuccess') });
    } catch (error) {
      notify({ type: 'error', message: error.message || t('cvManagement.errors.deleteCv') });
    } finally {
      setDeletingId('');
    }
  };

  const handleOpenFilePicker = () => {
    if (!userId) {
      notify({ type: 'warning', message: t('cvManagement.notifications.loginToUpload') });
      return;
    }

    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleUploadFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !userId) return;

    const formData = new FormData();
    formData.append('userId', String(userId));
    formData.append('cvFile', file);
    formData.append('cvTitle', file.name.replace(/\.[^/.]+$/, '') || file.name);
    formData.append('summary', '');

    setUploading(true);
    try {
      const response = await fetch('/api/cvs', {
        method: 'POST',
        body: formData
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || t('cvManagement.errors.uploadCv'));
      }

      notify({ type: 'success', message: t('cvManagement.notifications.uploadSuccess') });
      await loadCvs();
      setViewFilter('all');
    } catch (error) {
      notify({ type: 'error', message: error.message || t('cvManagement.errors.uploadCv') });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    loadCvs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="cv-management-page">
      <div className="container cv-management-container">
        <section className="cv-management-hero">
          <div className="cv-management-hero-content">
            <p className="cv-management-eyebrow">{t('cvManagement.hero.eyebrow')}</p>
            <h1>{t('cvManagement.hero.title')}</h1>
            <p>
              {t('cvManagement.hero.description')}
            </p>
          </div>

          <div className="cv-management-stats">
            <div className="cv-management-stat-card">
              <strong>{stats.total}</strong>
              <span>{t('cvManagement.stats.total')}</span>
            </div>
            <div className="cv-management-stat-card">
              <strong>{stats.online}</strong>
              <span>{t('cvManagement.stats.online')}</span>
            </div>
            <div className="cv-management-stat-card">
              <strong>{stats.uploaded}</strong>
              <span>{t('cvManagement.stats.uploaded')}</span>
            </div>
          </div>
        </section>

        <section className="cv-management-board">
          <div className="cv-management-board-head">
            <div>
              <h2>{t('cvManagement.board.title')}</h2>
              <p>{t('cvManagement.board.subtitle')}</p>
            </div>

            <div className="cv-management-board-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleUploadFile}
                className="cv-management-hidden-file-input"
              />

              <input
                type="text"
                placeholder={t('cvManagement.searchPlaceholder')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />

              <button
                type="button"
                className="cv-management-upload-btn"
                disabled={!userId || uploading}
                onClick={handleOpenFilePicker}
              >
                {uploading ? t('cvManagement.actions.uploading') : t('cvManagement.actions.uploadCv')}
              </button>

              <button type="button" onClick={() => navigate('/create-cv')}>{t('cvManagement.actions.createNewCv')}</button>
            </div>
          </div>

          <div className="cv-management-filter-row" role="group" aria-label={t('cvManagement.filters.ariaLabel')}>
            <button type="button" className={viewFilter === 'all' ? 'active' : ''} onClick={() => setViewFilter('all')}>
              {t('cvManagement.filters.all')}
            </button>
            <button type="button" className={viewFilter === 'online' ? 'active' : ''} onClick={() => setViewFilter('online')}>
              {t('cvManagement.filters.online')}
            </button>
            <button type="button" className={viewFilter === 'uploaded' ? 'active' : ''} onClick={() => setViewFilter('uploaded')}>
              {t('cvManagement.filters.uploaded')}
            </button>
          </div>

          {!userId ? (
            <div className="cv-management-empty">
              <div className="cv-management-empty-icon"><i className="bi bi-lock"></i></div>
              <h3>{t('cvManagement.states.notLoggedInTitle')}</h3>
              <p>{t('cvManagement.states.notLoggedInDesc')}</p>
              <Link to="/login" className="cv-management-primary-btn">{t('cvManagement.actions.loginNow')}</Link>
            </div>
          ) : loading ? (
            <div className="cv-management-empty">
              <div className="cv-management-empty-icon"><i className="bi bi-hourglass-split"></i></div>
              <h3>{t('cvManagement.states.loadingTitle')}</h3>
              <p>{t('cvManagement.states.loadingDesc')}</p>
            </div>
          ) : filteredCvs.length === 0 ? (
            <div className="cv-management-empty">
              <div className="cv-management-empty-icon"><i className="bi bi-file-earmark"></i></div>
              <h3>{t('cvManagement.states.emptyTitle')}</h3>
              <p>{t('cvManagement.states.emptyDesc')}</p>
              <button type="button" className="cv-management-primary-btn" onClick={() => navigate('/create-cv')}>
                {t('cvManagement.actions.goToTemplates')}
              </button>
            </div>
          ) : (
            <div className="cv-management-list">
              {filteredCvs.map((cv) => (
                <article key={cv.id} className="cv-management-item">
                  <div className="cv-management-item-head">
                    <div className="cv-management-item-main">
                      <h3>{cv.name}</h3>
                      <div className="cv-management-meta">
                        <span>{cv.typeLabel}</span>
                        <span>{t('cvManagement.labels.updatedAt', { date: formatDate(cv.updatedAt || cv.uploadDate, currentLocale) })}</span>
                        {cv.status ? <span>{t('cvManagement.labels.status', { status: cv.status })}</span> : null}
                      </div>
                      {cv.skills.length > 0 && (
                        <div className="cv-management-skills">
                          <span className="cv-management-skills-label">{t('cvManagement.labels.skills')}</span>
                          <div className="cv-management-skills-list">
                            {cv.skills.slice(0, 6).map((skill, index) => (
                              <span key={`${skill?.id || skill?.name || 'skill'}-${index}`} className="cv-management-skill-chip">
                                <span>{String(skill?.name || skill?.TenKyNang || '').trim()}</span>
                                {skill?.level || skill?.MucDo ? <small>{skill?.level || skill?.MucDo}</small> : null}
                              </span>
                            ))}
                            {cv.skills.length > 6 && (
                              <span className="cv-management-skill-chip cv-management-skill-chip--more">+{cv.skills.length - 6}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="cv-management-item-actions icon-only">
                      {cv.isOnlineCv ? (
                        <button
                          type="button"
                          className="cv-action-icon view"
                          onClick={() => navigate(`/create-cv/online-editor?cvId=${encodeURIComponent(cv.id)}&mode=view`)}
                          title={t('cvManagement.actions.viewOnlineCv')}
                          aria-label={t('cvManagement.actions.viewCvAria', { name: cv.name })}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                      ) : cv.previewUrl ? (
                        <a
                          href={cv.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="cv-action-icon view"
                          title={t('cvManagement.actions.viewCv')}
                          aria-label={t('cvManagement.actions.viewCvAria', { name: cv.name })}
                        >
                          <i className="bi bi-eye"></i>
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="cv-action-icon view"
                          disabled
                          title={t('cvManagement.states.noFile')}
                          aria-label={t('cvManagement.states.noFile')}
                        >
                          <i className="bi bi-eye-slash"></i>
                        </button>
                      )}

                      <button
                        type="button"
                        className="cv-action-icon edit"
                        disabled={!cv.isOnlineCv}
                        onClick={() => navigate(`/create-cv/online-editor?cvId=${encodeURIComponent(cv.id)}`)}
                        title={t('cvManagement.actions.editCv')}
                        aria-label={t('cvManagement.actions.editCvAria', { name: cv.name })}
                      >
                        <i className="bi bi-pencil-square"></i>
                      </button>

                      <button
                        type="button"
                        className="cv-action-icon delete"
                        disabled={deletingId === String(cv.id)}
                        onClick={() => handleDelete(cv.id)}
                        title={deletingId === String(cv.id) ? t('cvManagement.actions.deleting') : t('cvManagement.actions.deleteCv')}
                        aria-label={deletingId === String(cv.id) ? t('cvManagement.actions.deleting') : t('cvManagement.actions.deleteCvAria', { name: cv.name })}
                      >
                        <i className={`bi ${deletingId === String(cv.id) ? 'bi-arrow-repeat' : 'bi-trash'}`}></i>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CvManagementPage;
