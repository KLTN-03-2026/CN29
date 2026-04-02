import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../../components/NotificationProvider';
import './OnlineCvBuilder.css';

const LIVE_TEMPLATE = {
  id: 1,
  name: 'Live Editor CV',
  tags: ['Hiện đại', 'Chỉnh trực tiếp'],
  accent: 'live-editor',
};

const OnlineCvBuilder = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();

  const handleSelectTemplate = () => {
    navigate('/create-cv/online-editor?template=live-editor');
    notify({ type: 'info', title: 'Khởi tạo CV', message: 'Đã mở mẫu Live Editor duy nhất.' });
  };

  return (
    <div className="cv-templates-page">
      <div className="cv-templates-container">
        <nav className="cv-breadcrumb" aria-label="breadcrumb">
          <ol>
            <li><Link to="/">Trang chủ</Link></li>
            <li aria-current="page">Mẫu CV</li>
          </ol>
        </nav>

        <header className="cv-header">
          <h1>Mẫu CV chỉnh trực tiếp</h1>
          <p>
            Hệ thống hiện giữ 1 mẫu CV duy nhất để bạn chỉnh sửa trực tiếp ngay trên bản xem trước,
            tương tự trải nghiệm chỉnh sửa template trong Wedding editor.
          </p>
        </header>

        <section className="cv-template-grid">
          <article className="cv-template-card">
            <div className="cv-template-preview">
              <div className="cv-template-preview-top">
                <span className="cv-template-badge">Live</span>
              </div>
              <div className="cv-template-preview-paper">
                <div className="cv-preview-layout cv-preview-detailed cv-preview-live-editor">
                  <div className="cv-preview-live-sidebar" style={{ background: '#134e4a' }}>
                    <div className="cv-preview-avatar-square live"></div>
                    <div className="cv-preview-text-white">Ứng viên</div>
                    <div className="cv-preview-text-small">Chuyên viên Marketing</div>
                    <div className="cv-preview-divider-white"></div>
                    <div className="cv-preview-text-small">📱 0901234567</div>
                    <div className="cv-preview-text-small">✉ email@example.com</div>
                  </div>
                  <div className="cv-preview-live-main">
                    <div className="cv-preview-text-name" style={{ color: '#0f766e' }}>CV Online Chỉnh Trực Tiếp</div>
                    <div className="cv-preview-text-section" style={{ color: '#0f766e' }}>Mục tiêu nghề nghiệp</div>
                    <div className="cv-preview-line-text"></div>
                    <div className="cv-preview-line-text short"></div>
                    <div className="cv-preview-text-section" style={{ color: '#0f766e' }}>Kinh nghiệm làm việc</div>
                    <div className="cv-preview-line-text"></div>
                    <div className="cv-preview-line-text"></div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="cv-template-use"
                onClick={handleSelectTemplate}
              >
                Dùng mẫu duy nhất
              </button>
            </div>

            <div className="cv-template-palette">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>

            <div className="cv-template-name">{LIVE_TEMPLATE.name}</div>
            <div className="cv-template-tags">
              {LIVE_TEMPLATE.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
};

export default OnlineCvBuilder;
