import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const SearchableSelectField = ({
  id,
  label,
  iconClass,
  value,
  options,
  defaultLabel,
  searchPlaceholder,
  noResultsLabel,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchInputRef = useRef(null);

  const safeOptions = Array.isArray(options) ? options : [];

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return safeOptions;
    return safeOptions.filter((item) => normalizeText(item).includes(normalizedQuery));
  }, [safeOptions, query]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
        setQuery('');
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    const frameId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToggleOpen = () => {
    setIsOpen((prev) => {
      if (prev) {
        setQuery('');
      }
      return !prev;
    });
  };

  const handleSelectValue = (nextValue) => {
    onChange(nextValue);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className={`home-search-field home-search-field-select ${isOpen ? 'is-open' : ''}`} ref={rootRef}>
      <label htmlFor={id}>{label}</label>
      <div className="home-search-input-wrap home-search-select-wrap">
        <i className={`bi ${iconClass}`} aria-hidden="true"></i>
        <button
          type="button"
          id={id}
          className="home-search-select-trigger"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={`${id}-listbox`}
          onClick={handleToggleOpen}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsOpen(true);
            }
          }}
        >
          <span className={`home-search-select-value ${value ? '' : 'is-placeholder'}`}>
            {value || defaultLabel}
          </span>
          <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} home-search-select-chevron`} aria-hidden="true"></i>
        </button>
      </div>

      {isOpen ? (
        <div className="home-search-dropdown-panel" id={`${id}-listbox`} role="listbox" aria-labelledby={id}>
          <div className="home-search-dropdown-search">
            <i className="bi bi-search" aria-hidden="true"></i>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>

          <div className="home-search-dropdown-options">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              className={`home-search-dropdown-option ${!value ? 'is-selected' : ''}`}
              onClick={() => handleSelectValue('')}
            >
              <span>{defaultLabel}</span>
              {!value ? <i className="bi bi-check2" aria-hidden="true"></i> : null}
            </button>

            {filteredOptions.length === 0 ? (
              <div className="home-search-dropdown-empty">{noResultsLabel}</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option === value;

                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`home-search-dropdown-option ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelectValue(option)}
                  >
                    <span>{option}</span>
                    {isSelected ? <i className="bi bi-check2" aria-hidden="true"></i> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

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

      <SearchableSelectField
        id="homeIndustry"
        label={t('home.search.industryLabel')}
        iconClass="bi-briefcase"
        value={searchForm.industry}
        options={industries}
        defaultLabel={t('home.search.allIndustries')}
        searchPlaceholder={t('home.search.searchIndustryPlaceholder')}
        noResultsLabel={t('home.search.noOptionFound')}
        onChange={(nextValue) => onSearchFieldChange('industry', nextValue)}
      />

      <SearchableSelectField
        id="homeLocation"
        label={t('home.search.locationLabel')}
        iconClass="bi-geo-alt"
        value={searchForm.location}
        options={locations}
        defaultLabel={t('home.search.nationwide')}
        searchPlaceholder={t('home.search.searchLocationPlaceholder')}
        noResultsLabel={t('home.search.noOptionFound')}
        onChange={(nextValue) => onSearchFieldChange('location', nextValue)}
      />

      <button type="submit" className="home-search-submit">
        {t('home.search.submit')}
      </button>
    </form>
  );
};

export default JobSearchBar;
