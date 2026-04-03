import React from 'react';

const BENEFITS = [
  {
    key: 'matching',
    icon: 'bi-stars',
    title: 'Gợi ý việc làm phù hợp',
    description: 'Hệ thống ưu tiên hiển thị công việc phù hợp theo hồ sơ và nhu cầu tìm việc của bạn.'
  },
  {
    key: 'cv',
    icon: 'bi-file-earmark-richtext',
    title: 'Hồ sơ CV dễ tạo',
    description: 'Chọn mẫu CV chuyên nghiệp, chỉnh sửa nhanh và sẵn sàng ứng tuyển ngay.'
  },
  {
    key: 'apply',
    icon: 'bi-lightning-charge',
    title: 'Ứng tuyển nhanh',
    description: 'Lưu việc yêu thích, gửi hồ sơ chỉ với vài thao tác và theo dõi lịch sử ứng tuyển.'
  },
  {
    key: 'tracking',
    icon: 'bi-graph-up-arrow',
    title: 'Theo dõi tiến trình',
    description: 'Nắm rõ trạng thái hồ sơ để không bỏ lỡ phản hồi quan trọng từ nhà tuyển dụng.'
  }
];

const TrustBenefitsSection = () => {
  return (
    <section className="home-benefits-section">
      <div className="home-benefits-header">
        <p className="home-section-eyebrow">Lợi ích cốt lõi</p>
        <h2>Lý do nên tìm việc tại JobFinder</h2>
      </div>

      <div className="home-benefits-grid">
        {BENEFITS.map((benefit) => (
          <article key={benefit.key} className="home-benefit-card">
            <div className="home-benefit-icon">
              <i className={`bi ${benefit.icon}`}></i>
            </div>
            <h3>{benefit.title}</h3>
            <p>{benefit.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default TrustBenefitsSection;
