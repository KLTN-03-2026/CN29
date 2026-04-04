import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE as CLIENT_API_BASE } from '../../config/apiBase';
import './JobTrackerPages.css';

const fmtVnd = new Intl.NumberFormat('vi-VN');

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

const MatchingJobsPage = () => {
  const navigate = useNavigate();
  const API_BASE = CLIENT_API_BASE;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        setItems([]);
        setError('Bạn cần đăng nhập để xem việc làm phù hợp.');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/jobs/matching`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data && data.error) || 'Không tải được việc làm phù hợp');
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Không tải được việc làm phù hợp');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [API_BASE]);

  return (
    <div className="job-tracker-page">
      <div className="container">
        <div className="job-tracker-shell">
          <header className="job-tracker-header theme-matching">
            <div>
              <h1 className="job-tracker-title">Việc làm phù hợp</h1>
              <p className="job-tracker-subtitle">Gợi ý thông minh theo hồ sơ ứng viên để bạn tập trung vào cơ hội có độ khớp cao.</p>
              {!loading && !error ? (
                <div className="job-tracker-count">
                  <i className="bi bi-stars"></i>
                  {items.length.toLocaleString('vi-VN')} gợi ý dành cho bạn
                </div>
              ) : null}
            </div>
            <button type="button" className="btn job-tracker-back" onClick={() => navigate(-1)}>
              Quay lại
            </button>
          </header>

          {loading ? <div className="job-tracker-state">Đang phân tích và tải việc làm phù hợp...</div> : null}
          {error && !loading ? <div className="alert alert-danger mb-0">{error}</div> : null}

          {!loading && !error && items.length === 0 ? (
            <div className="job-tracker-empty">
              <i className="bi bi-search-heart"></i>
              <h5>Chưa có gợi ý phù hợp</h5>
              <p>Hãy cập nhật hồ sơ cá nhân hoặc mở rộng tiêu chí tìm việc để nhận thêm đề xuất.</p>
              <Link to="/jobs" className="btn btn-primary">Xem tất cả việc làm</Link>
            </div>
          ) : null}

          {!loading && !error && items.length > 0 ? (
            <section className="job-tracker-list">
              {items.map((j) => (
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
                      <span className="job-chip match"><i className="bi bi-stars"></i>Gợi ý phù hợp</span>
                    </div>
                  </div>

                  <div className="job-tracker-actions">
                    <Link to={`/jobs/${j.MaTin}`} className="btn btn-primary">Xem chi tiết</Link>
                  </div>
                </article>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MatchingJobsPage;
