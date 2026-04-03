import React from 'react';
import { Link } from 'react-router-dom';

const CVBuilderCTA = () => {
  return (
    <section className="home-cv-cta">
      <div className="home-cv-cta-content">
        <div>
          <p className="home-section-eyebrow">Tăng tỷ lệ được gọi phỏng vấn</p>
          <h2>Tạo CV và hoàn thiện hồ sơ ngay hôm nay</h2>
          <p>
            Tối ưu hồ sơ của bạn để nhận gợi ý việc làm phù hợp hơn và gây ấn tượng tốt hơn với nhà tuyển dụng.
          </p>
        </div>

        <div className="home-cv-cta-actions">
          <Link to="/create-cv" className="home-cv-cta-primary">Tạo CV ngay</Link>
          <Link to="/create-cv/templates" className="home-cv-cta-secondary">Chọn mẫu CV</Link>
        </div>
      </div>
    </section>
  );
};

export default CVBuilderCTA;
