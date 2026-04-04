import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const AppliedJobsPage = () => {
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
        setError('Bạn cần đăng nhập để xem việc làm đã ứng tuyển.');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/applications/mine`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data && data.error) || 'Không tải được danh sách việc làm đã ứng tuyển');
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Không tải được danh sách việc làm đã ứng tuyển');
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
          <header className="job-tracker-header theme-applied">
            <div>
              <h1 className="job-tracker-title">Việc làm đã ứng tuyển</h1>
              <p className="job-tracker-subtitle">Theo dõi tiến trình ứng tuyển và xem lại các cơ hội bạn đã nộp hồ sơ.</p>
              {!loading && !error ? (
                <div className="job-tracker-count">
                  <i className="bi bi-send-check"></i>
                  {items.length.toLocaleString('vi-VN')} hồ sơ đã nộp
                </div>
              ) : null}
            </div>
            <button type="button" className="btn job-tracker-back" onClick={() => navigate(-1)}>
              Quay lại
            </button>
          </header>

          {loading ? <div className="job-tracker-state">Đang tải danh sách việc làm đã ứng tuyển...</div> : null}
          {error && !loading ? <div className="alert alert-danger mb-0">{error}</div> : null}

          {!loading && !error && items.length === 0 ? (
            <div className="job-tracker-empty">
              <i className="bi bi-send-x"></i>
              <h5>Bạn chưa ứng tuyển công việc nào</h5>
              <p>Khám phá thêm cơ hội và gửi hồ sơ để tăng khả năng được nhà tuyển dụng phản hồi.</p>
              <Link to="/jobs" className="btn btn-primary">Tìm việc ngay</Link>
            </div>
          ) : null}

          {!loading && !error && items.length > 0 ? (
            <section className="job-tracker-list">
              {items.map((j) => {
                const appliedAt = formatDate(j.NgayNop);
                return (
                  <article key={j.MaUngTuyen} className="job-tracker-card">
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
                        {appliedAt ? <span className="job-chip"><i className="bi bi-calendar-check"></i>Nộp ngày {appliedAt}</span> : null}
                        <span className="job-chip status"><i className="bi bi-file-earmark-check"></i>{j.TrangThai || 'Đã nộp'}</span>
                      </div>
                    </div>

                    <div className="job-tracker-actions">
                      <Link to={`/jobs/${j.MaTin}`} className="btn btn-primary">Xem lại tin</Link>
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

export default AppliedJobsPage;
