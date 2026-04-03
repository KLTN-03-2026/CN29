import React from 'react';

const LatestJobsSection = ({
  jobs,
  totalJobs,
  loading,
  error,
  savedSet,
  toolbarOptions,
  activeToolbar,
  onToolbarChange,
  onToggleSave,
  onOpenJob,
  onApplyJob,
  onViewAllJobs,
  formatSalary,
  getPostedLabel,
  getHighlightBadge
}) => {
  return (
    <section className="home-jobs-section">
      <div className="home-jobs-header">
        <div className="home-jobs-header-left">
          <p className="home-section-eyebrow">Việc làm dành cho bạn</p>
          <h2>Việc làm mới và phù hợp</h2>
        </div>

        <div className="home-jobs-header-right">
          <p className="home-section-subtitle home-section-subtitle-right">
            {loading ? 'Đang đồng bộ dữ liệu việc làm...' : `${totalJobs.toLocaleString('vi-VN')} cơ hội đang chờ bạn khám phá.`}
          </p>

          <button type="button" className="home-view-all-btn" onClick={onViewAllJobs}>
            Xem tất cả việc làm
          </button>
        </div>
      </div>

      <div className="home-jobs-toolbar" role="group" aria-label="Lọc nhanh danh sách việc làm">
        {toolbarOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`home-toolbar-chip ${activeToolbar === option.key ? 'is-active' : ''}`}
            onClick={() => onToolbarChange(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error ? <div className="home-jobs-error">{error}</div> : null}

      {loading ? (
        <div className="home-jobs-loading">Đang tải danh sách việc làm...</div>
      ) : jobs.length === 0 ? (
        <div className="home-jobs-empty">Chưa có việc làm phù hợp với bộ lọc hiện tại.</div>
      ) : (
        <div className="home-jobs-feed">
          {jobs.map((job) => {
            const isSaved = savedSet.has(String(job.MaTin));
            const badgeLabel = getHighlightBadge(job);

            return (
              <article key={job.MaTin} className="home-job-card">
                <div className="home-job-logo-wrap">
                  <img
                    src={job.Logo || '/images/logo.png'}
                    alt={job.TenCongTy || 'Logo nhà tuyển dụng'}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = '/images/logo.png';
                    }}
                  />
                </div>

                <div className="home-job-main">
                  <div className="home-job-title-row">
                    <button
                      type="button"
                      className="home-job-title-btn"
                      onClick={() => onOpenJob(job)}
                    >
                      {job.TieuDe || 'Chưa có tiêu đề'}
                    </button>
                  </div>

                  <div className="home-job-company">{job.TenCongTy || 'Nhà tuyển dụng'}</div>

                  <div className="home-job-meta">
                    <span><i className="bi bi-cash-coin"></i>{formatSalary(job)}</span>
                    <span><i className="bi bi-geo-alt"></i>{job.ThanhPho || job.DiaDiem || 'Toàn quốc'}</span>
                    <span><i className="bi bi-briefcase"></i>{job.HinhThuc || 'Toàn thời gian'}</span>
                    <span><i className="bi bi-person-workspace"></i>{job.KinhNghiem || 'Không yêu cầu'}</span>
                  </div>
                </div>

                <div className="home-job-side">
                  <div className="home-job-status">
                    <span className="home-job-time">{getPostedLabel(job)}</span>
                    {badgeLabel ? <span className="home-job-badge home-job-side-badge">{badgeLabel}</span> : null}
                  </div>

                  <div className="home-job-actions">
                    <button
                      type="button"
                      className={`home-save-btn ${isSaved ? 'is-saved' : ''}`}
                      onClick={() => onToggleSave(job.MaTin)}
                      title={isSaved ? 'Bỏ lưu việc làm' : 'Lưu việc làm'}
                    >
                      <i className={`bi ${isSaved ? 'bi-heart-fill' : 'bi-heart'}`}></i>
                    </button>
                    <button
                      type="button"
                      className="home-apply-btn"
                      onClick={() => onApplyJob(job)}
                    >
                      Ứng tuyển
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default LatestJobsSection;
