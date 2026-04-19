import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <section className="home-hero">
      <div className="home-hero-inner">
        <div className="home-hero-showcase">
          <div className="home-hero-copy">
            <p className="home-hero-eyebrow">{t('home.hero.eyebrow')}</p>
            <h1>{t('home.hero.title')}</h1>
            <p>
              {t('home.hero.subtitle')}
            </p>

            <div className="home-hero-cta">
              <Link to="/jobs" className="home-hero-primary-btn">{t('home.hero.ctaFindJobs')}</Link>
              <Link to="/create-cv" className="home-hero-secondary-btn">{t('home.hero.ctaCreateProfile')}</Link>
            </div>
          </div>

          <aside className="home-hero-highlight" aria-label={t('home.hero.highlightAria')}>
            <p>{t('home.hero.highlightTitle')}</p>
            <ul>
              <li>{t('home.hero.highlightStep1')}</li>
              <li>{t('home.hero.highlightStep2')}</li>
              <li>{t('home.hero.highlightStep3')}</li>
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
