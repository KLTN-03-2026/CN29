import React from 'react';
import { useTranslation } from 'react-i18next';

const JobQuickFilters = ({ filters, activeFilter, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className="home-quick-filters" role="group" aria-label={t('home.filters.quick.aria')}>
      {filters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          className={`home-quick-chip ${activeFilter === filter.key ? 'is-active' : ''}`}
          onClick={() => onChange(filter.key)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

export default JobQuickFilters;
