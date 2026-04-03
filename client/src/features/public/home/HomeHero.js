import React from 'react';
import { Link } from 'react-router-dom';
import JobSearchBar from './JobSearchBar';
import JobQuickFilters from './JobQuickFilters';

const HomeHero = ({
  searchForm,
  industries,
  locations,
  quickFilters,
  activeQuickFilter,
  trustStats,
  onSearchFieldChange,
  onSearchSubmit,
  onQuickFilterChange
}) => {
  return (
    <section className="home-hero">
      <div className="home-hero-inner">
        <div className="home-hero-showcase">
          <div className="home-hero-copy">
            <p className="home-hero-eyebrow">Nền tảng tìm việc đáng tin cậy</p>
            <h1>Tìm đúng việc phù hợp với bạn trong vài giây</h1>
            <p>
              Khám phá cơ hội mới, lọc theo nhu cầu và ứng tuyển nhanh với một giao diện trực quan ngay khi vừa truy cập.
            </p>

            <div className="home-hero-cta">
              <Link to="/jobs" className="home-hero-primary-btn">Bắt đầu tìm việc ngay</Link>
              <Link to="/create-cv" className="home-hero-secondary-btn">Tạo hồ sơ nổi bật</Link>
            </div>
          </div>

          <aside className="home-hero-highlight" aria-label="Lợi ích chính">
            <p>03 bước rõ ràng</p>
            <ul>
              <li>Tạo hồ sơ chuyên nghiệp</li>
              <li>Lọc công việc đúng nhu cầu</li>
              <li>Ứng tuyển và theo dõi dễ dàng</li>
            </ul>
          </aside>
        </div>

        <JobSearchBar
          searchForm={searchForm}
          industries={industries}
          locations={locations}
          onSearchFieldChange={onSearchFieldChange}
          onSearchSubmit={onSearchSubmit}
        />

        <JobQuickFilters
          filters={quickFilters}
          activeFilter={activeQuickFilter}
          onChange={onQuickFilterChange}
        />

        <div className="home-trust-stats">
          {trustStats.map((metric) => (
            <div key={metric.label} className="home-trust-item">
              <div className="home-trust-value">{metric.value}</div>
              <div className="home-trust-label">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
