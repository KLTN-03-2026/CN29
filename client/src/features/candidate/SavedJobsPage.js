import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../../components/NotificationProvider';
import { API_BASE as CLIENT_API_BASE } from '../../config/apiBase';
import './JobTrackerPages.css';

const fmtVnd = new Intl.NumberFormat('vi-VN');
const fmtDate = new Intl.DateTimeFormat('vi-VN');

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return fmtDate.format(d);
};

const formatSalary = (job) => {
  const type = job.KieuLuong || 'Thỏa thuận';
  const from = job.LuongTu == null ? null : Number(job.LuongTu);
  const to = job.LuongDen == null ? null : Number(job.LuongDen);

  if (type === 'Thỏa thuận' || (from == null && to == null)) return 'Thỏa thuận';
  const unit = String(type).toLowerCase();

  if (Number.isFinite(from) && Number.isFinite(to)) return `${fmtVnd.format(from)} - ${fmtVnd.format(to)} VND/${unit}`;
  if (Number.isFinite(from)) return `Từ ${fmtVnd.format(from)} VND/${unit}`;
  if (Number.isFinite(to)) return `Đến ${fmtVnd.format(to)} VND/${unit}`;
  return 'Thỏa thuận';
};

const SavedJobsPage = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const API_BASE = CLIENT_API_BASE;

  const token = useMemo(() => localStorage.getItem('token') || '', []);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      if (!token) {
        setLoading(false);
        setItems([]);
        setError('Bạn cần đăng nhập để xem việc làm đã lưu.');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/jobs/saved`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data && data.error) || 'Không tải được danh sách việc làm đã lưu');

        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Không tải được danh sách việc làm đã lưu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, token]);

  const removeSaved = async (jobId) => {
    if (!token) {
      notify({ type: 'error', message: 'Bạn cần đăng nhập.' });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/jobs/saved/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && data.error) || 'Không thể bỏ lưu');

      setItems((prev) => prev.filter((x) => String(x.MaTin) !== String(jobId)));
      notify({ type: 'success', message: 'Đã bỏ lưu công việc.' });
    } catch (err) {
      notify({ type: 'error', message: err.message || 'Không thể bỏ lưu' });
    }
  };

  return (
    <div className="job-tracker-page">
      <div className="container">
        <div className="job-tracker-shell">
          <header className="job-tracker-header theme-saved">
            <div>
              <h1 className="job-tracker-title">Việc làm đã lưu</h1>
              <p className="job-tracker-subtitle">Theo dõi lại các tin tuyển dụng bạn quan tâm để ứng tuyển nhanh khi phù hợp.</p>
              {!loading && !error ? (
                <div className="job-tracker-count">
                  <i className="bi bi-bookmark-heart"></i>
                  {items.length.toLocaleString('vi-VN')} tin đã lưu
                </div>
              ) : null}
            </div>
            <button type="button" className="btn job-tracker-back" onClick={() => navigate(-1)}>
              Quay lại
            </button>
          </header>

          {loading ? <div className="job-tracker-state">Đang tải danh sách việc làm đã lưu...</div> : null}
          {error && !loading ? <div className="alert alert-danger mb-0">{error}</div> : null}

          {!loading && !error && items.length === 0 ? (
            <div className="job-tracker-empty">
              <i className="bi bi-bookmark-x"></i>
              <h5>Bạn chưa lưu công việc nào</h5>
              <p>Lưu các công việc phù hợp để theo dõi và ứng tuyển vào thời điểm tốt nhất.</p>
              <Link to="/jobs" className="btn btn-success">Tìm việc ngay</Link>
            </div>
          ) : null}

          {!loading && !error && items.length > 0 ? (
            <section className="job-tracker-list">
              {items.map((j) => {
                const deadline = formatDate(j.HanNopHoSo);
                return (
                  <article key={j.MaTin} className="job-tracker-card">
                    <div className="job-tracker-logo">
                      <img
                        src={j.Logo || '/images/logo.png'}
                        alt={j.TenCongTy || 'Logo'}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/images/logo.png';
                        }}
                      />
                    </div>

                    <div className="job-tracker-body">
                      <h4 className="job-tracker-job-title">
                        <Link to={`/jobs/${j.MaTin}`}>{j.TieuDe}</Link>
                      </h4>
                      <div className="job-tracker-company">{j.TenCongTy || 'Nhà tuyển dụng'}</div>

                      <div className="job-tracker-meta">
                        <span className="job-chip"><i className="bi bi-geo-alt"></i>{j.ThanhPho || '---'}</span>
                        <span className="job-chip"><i className="bi bi-briefcase"></i>{j.HinhThuc || '---'}</span>
                        <span className="job-chip"><i className="bi bi-cash-coin"></i>{formatSalary(j)}</span>
                        {deadline ? <span className="job-chip"><i className="bi bi-calendar-event"></i>Hạn nộp {deadline}</span> : null}
                      </div>
                    </div>

                    <div className="job-tracker-actions">
                      <Link to={`/jobs/${j.MaTin}`} className="btn btn-success">Xem chi tiết</Link>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => removeSaved(j.MaTin)}
                        aria-label="Bỏ lưu"
                      >
                        <i className="bi bi-bookmark-x me-1"></i>
                        Bỏ lưu
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SavedJobsPage;

