import React from 'react';

const JobSearchBar = ({
  searchForm,
  industries,
  locations,
  onSearchFieldChange,
  onSearchSubmit
}) => {
  return (
    <form className="home-search-box" onSubmit={onSearchSubmit}>
      <div className="home-search-field">
        <label htmlFor="homeKeyword">Vị trí công việc</label>
        <div className="home-search-input-wrap">
          <i className="bi bi-search"></i>
          <input
            id="homeKeyword"
            type="text"
            value={searchForm.keyword}
            onChange={(event) => onSearchFieldChange('keyword', event.target.value)}
            placeholder="Ví dụ: Frontend Developer"
          />
        </div>
      </div>

      <div className="home-search-field">
        <label htmlFor="homeIndustry">Ngành nghề</label>
        <div className="home-search-input-wrap">
          <i className="bi bi-briefcase"></i>
          <select
            id="homeIndustry"
            value={searchForm.industry}
            onChange={(event) => onSearchFieldChange('industry', event.target.value)}
          >
            <option value="">Tất cả ngành nghề</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="home-search-field">
        <label htmlFor="homeLocation">Địa điểm</label>
        <div className="home-search-input-wrap">
          <i className="bi bi-geo-alt"></i>
          <select
            id="homeLocation"
            value={searchForm.location}
            onChange={(event) => onSearchFieldChange('location', event.target.value)}
          >
            <option value="">Toàn quốc</option>
            {locations.map((location) => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>
      </div>

      <button type="submit" className="home-search-submit">
        Tìm việc ngay
      </button>
    </form>
  );
};

export default JobSearchBar;
