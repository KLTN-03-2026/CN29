import React from 'react';
import { useTranslation } from 'react-i18next';

const JobSearchBar = ({
  searchForm,
  industries,
  locations,
  onSearchFieldChange,
  onSearchSubmit
}) => {
  const { t } = useTranslation();

  return (
    <form className="home-search-box" onSubmit={onSearchSubmit}>
      <div className="home-search-field">
        <label htmlFor="homeKeyword">{t('home.search.jobTitleLabel')}</label>
        <div className="home-search-input-wrap">
          <i className="bi bi-search"></i>
          <input
            id="homeKeyword"
            type="text"
            value={searchForm.keyword}
            onChange={(event) => onSearchFieldChange('keyword', event.target.value)}
            placeholder={t('home.search.keywordPlaceholder')}
          />
        </div>
      </div>

      <div className="home-search-field">
        <label htmlFor="homeIndustry">{t('home.search.industryLabel')}</label>
        <div className="home-search-input-wrap">
          <i className="bi bi-briefcase"></i>
          <select
            id="homeIndustry"
            value={searchForm.industry}
            onChange={(event) => onSearchFieldChange('industry', event.target.value)}
          >
            <option value="">{t('home.search.allIndustries')}</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="home-search-field">
        <label htmlFor="homeLocation">{t('home.search.locationLabel')}</label>
        <div className="home-search-input-wrap">
          <i className="bi bi-geo-alt"></i>
          <select
            id="homeLocation"
            value={searchForm.location}
            onChange={(event) => onSearchFieldChange('location', event.target.value)}
          >
            <option value="">{t('home.search.nationwide')}</option>
            {locations.map((location) => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
        </div>
      </div>

      <button type="submit" className="home-search-submit">
        {t('home.search.submit')}
      </button>
    </form>
  );
};

export default JobSearchBar;
