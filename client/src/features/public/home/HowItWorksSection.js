import React from 'react';

const STEPS = [
  {
    id: 'profile',
    icon: 'bi-person-vcard',
    title: 'Tạo hồ sơ',
    description: 'Cập nhật thông tin cá nhân, kinh nghiệm và kỹ năng để hồ sơ nổi bật hơn.'
  },
  {
    id: 'search',
    icon: 'bi-search',
    title: 'Tìm việc phù hợp',
    description: 'Lọc theo ngành nghề, địa điểm, mức lương và hình thức làm việc trong vài giây.'
  },
  {
    id: 'apply',
    icon: 'bi-send-check',
    title: 'Ứng tuyển nhanh',
    description: 'Nộp CV trực tiếp, theo dõi trạng thái ứng tuyển và phản hồi từ nhà tuyển dụng.'
  }
];

const HowItWorksSection = () => {
  return (
    <section className="home-how-section">
      <div className="home-how-header">
        <p className="home-section-eyebrow">Quy trình rõ ràng</p>
        <h2>Quy trình tìm việc đơn giản</h2>
      </div>

      <div className="home-how-grid">
        {STEPS.map((step, index) => (
          <article key={step.id} className="home-how-card">
            <span className="home-how-step">Bước {index + 1}</span>
            <div className="home-how-icon">
              <i className={`bi ${step.icon}`}></i>
            </div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default HowItWorksSection;
