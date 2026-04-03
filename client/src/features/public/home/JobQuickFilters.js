import React from 'react';

const JobQuickFilters = ({ filters, activeFilter, onChange }) => {
  return (
    <div className="home-quick-filters" role="group" aria-label="Bộ lọc nhanh việc làm">
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
