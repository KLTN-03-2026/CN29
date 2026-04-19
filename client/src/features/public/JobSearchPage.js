import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../components/NotificationProvider';
import { API_BASE as CLIENT_API_BASE } from '../../config/apiBase';
import { buildIndustryEntries, buildLocationEntries } from './jobSearchOptions';

const formatCount = (value, locale = 'vi-VN') => new Intl.NumberFormat(locale).format(Number(value) || 0);

const EXPERIENCE_OPTIONS = [
  'Tất cả',
  'Dưới 1 năm',
  '1 năm',
  '2 năm',
  '3 năm',
  '4 năm',
  '5 năm',
  'Trên 5 năm',
  'Không yêu cầu'
];

const LEVEL_OPTIONS = [
  'Tất cả',
  'Nhân viên',
  'Trưởng nhóm',
  'Trưởng/Phó phòng',
  'Quản lý / Giám sát',
  'Trưởng chi nhánh',
  'Phó giám đốc',
  'Giám đốc',
  'Thực tập sinh'
];

const SALARY_OPTIONS = [
  'Tất cả',
  '10 - 15 triệu',
  '15 - 20 triệu',
  '20 - 25 triệu',
  '25 - 30 triệu',
  '30 - 50 triệu',
  'Trên 50 triệu',
  'Thỏa thuận'
];

const WORKING_FORM_OPTIONS = ['Tất cả', 'Toàn thời gian', 'Bán thời gian', 'Thực tập', 'Khác'];

const OPTION_LABEL_KEYS = {
  'Tất cả': 'jobSearch.options.all',
  'Dưới 1 năm': 'jobSearch.options.expUnder1Year',
  '1 năm': 'jobSearch.options.exp1Year',
  '2 năm': 'jobSearch.options.exp2Years',
  '3 năm': 'jobSearch.options.exp3Years',
  '4 năm': 'jobSearch.options.exp4Years',
  '5 năm': 'jobSearch.options.exp5Years',
  'Trên 5 năm': 'jobSearch.options.expOver5Years',
  'Không yêu cầu': 'jobSearch.options.notRequired',
  'Nhân viên': 'jobSearch.options.levelStaff',
  'Trưởng nhóm': 'jobSearch.options.levelTeamLead',
  'Trưởng/Phó phòng': 'jobSearch.options.levelDepartmentLead',
  'Quản lý / Giám sát': 'jobSearch.options.levelManager',
  'Trưởng chi nhánh': 'jobSearch.options.levelBranchLead',
  'Phó giám đốc': 'jobSearch.options.levelViceDirector',
  'Giám đốc': 'jobSearch.options.levelDirector',
  'Thực tập sinh': 'jobSearch.options.levelIntern',
  '10 - 15 triệu': 'jobSearch.options.salary10to15',
  '15 - 20 triệu': 'jobSearch.options.salary15to20',
  '20 - 25 triệu': 'jobSearch.options.salary20to25',
  '25 - 30 triệu': 'jobSearch.options.salary25to30',
  '30 - 50 triệu': 'jobSearch.options.salary30to50',
  'Trên 50 triệu': 'jobSearch.options.salaryOver50',
  'Thỏa thuận': 'jobSearch.options.negotiable',
  'Toàn thời gian': 'jobSearch.options.fullTime',
  'Bán thời gian': 'jobSearch.options.partTime',
  'Thực tập': 'jobSearch.options.internship',
  'Khác': 'jobSearch.options.other',
  'Tất cả lĩnh vực': 'jobSearch.options.allFields',
  'Tất cả ngành nghề': 'jobSearch.search.allIndustries',
  'Toàn quốc': 'jobSearch.search.nationwide'
};

const translateOptionLabel = (value, t) => {
  const key = OPTION_LABEL_KEYS[String(value || '').trim()];
  if (!key) return String(value || '');
  return t(key, { defaultValue: String(value || '') });
};

const resolveSalaryUnitLabel = (rawUnit, t) => {
  const unit = String(rawUnit || '').trim().toLowerCase();
  const normalized = unit
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized.includes('thang') || normalized.includes('month')) return t('jobSearch.salary.unit.month');
  if (normalized.includes('ngay') || normalized.includes('day')) return t('jobSearch.salary.unit.day');
  if (normalized.includes('gio') || normalized.includes('hour')) return t('jobSearch.salary.unit.hour');
  return t('jobSearch.salary.unit.job');
};

const formatSalary = (job, t, locale = 'vi-VN') => {
  const type = job.KieuLuong || 'Thỏa thuận';
  const from = job.LuongTu == null ? null : Number(job.LuongTu);
  const to = job.LuongDen == null ? null : Number(job.LuongDen);
  const salaryUnit = resolveSalaryUnitLabel(type, t);

  if (type === 'Thỏa thuận' || (from == null && to == null)) return t('jobSearch.salary.negotiable');

  if (Number.isFinite(from) && Number.isFinite(to)) {
    return t('jobSearch.salary.range', {
      from: formatCount(from, locale),
      to: formatCount(to, locale),
      unit: salaryUnit
    });
  }

  if (Number.isFinite(from)) {
    return t('jobSearch.salary.from', {
      amount: formatCount(from, locale),
      unit: salaryUnit
    });
  }

  if (Number.isFinite(to)) {
    return t('jobSearch.salary.to', {
      amount: formatCount(to, locale),
      unit: salaryUnit
    });
  }

  return t('jobSearch.salary.negotiable');
};

const ADV_DEFAULTS = {
  exp: 'Tất cả',
  level: 'Tất cả',
  salary: 'Tất cả',
  salaryFrom: '',
  salaryTo: '',
  companyField: 'Tất cả lĩnh vực',
  jobField: 'Tất cả lĩnh vực',
  workingForm: 'Tất cả'
};

const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const norm = (value) => String(value ?? '').trim().toLowerCase();

const parseMillionVnd = (value) => {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed * 1000000;
};

const salaryOverlap = (jobFrom, jobTo, filterFrom, filterTo) => {
  const jf = toNumber(jobFrom);
  const jt = toNumber(jobTo);
  const ff = toNumber(filterFrom);
  const ft = toNumber(filterTo);

  if (ff == null && ft == null) return true;
  if (jf == null && jt == null) return false;

  const low = jf == null ? jt : jf;
  const high = jt == null ? jf : jt;

  if (ff != null && ft != null) return !(high < ff || low > ft);
  if (ff != null) return (high ?? low) >= ff;
  if (ft != null) return (low ?? high) <= ft;
  return true;
};

const salaryAdvMatches = (job, salaryLabel) => {
  if (salaryLabel === 'Tất cả') return true;

  const jf = toNumber(job.LuongTu);
  const jt = toNumber(job.LuongDen);
  const salaryType = (job.KieuLuong || '').toLowerCase();

  if (salaryLabel === 'Thỏa thuận') {
    return salaryType.includes('thỏa') || (jf == null && jt == null);
  }

  const labelToRange = (label) => {
    switch (label) {
      case '10 - 15 triệu':
        return [10000000, 15000000];
      case '15 - 20 triệu':
        return [15000000, 20000000];
      case '20 - 25 triệu':
        return [20000000, 25000000];
      case '25 - 30 triệu':
        return [25000000, 30000000];
      case '30 - 50 triệu':
        return [30000000, 50000000];
      case 'Trên 50 triệu':
        return [50000000, Number.MAX_SAFE_INTEGER];
      default:
        return null;
    }
  };

  const range = labelToRange(salaryLabel);
  if (!range) return true;
  return salaryOverlap(jf, jt, range[0], range[1]);
};

const getProvinceLabel = (item) => {
  if (typeof item === 'string') return item;
  return item?.TenTinh || item?.name || '';
};

const getPostedLabel = (job, t) => {
  const dateSource = job?.NgayDang || job?.NgayTao || job?.createdAt;
  const timestamp = Date.parse(dateSource || '');

  if (!Number.isFinite(timestamp)) return t('jobSearch.time.postedRecently');

  const diffMs = Date.now() - timestamp;
  if (diffMs <= 0) return t('jobSearch.time.justPosted');

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return t('jobSearch.time.justPosted');
  if (diffHours < 24) return t('jobSearch.time.hoursAgo', { count: diffHours });

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 30) return t('jobSearch.time.daysAgo', { count: diffDays });
  return t('jobSearch.time.postedLongAgo');
};

const getNumericSalaryText = (job, t, locale = 'vi-VN') => {
  const from = toNumber(job.LuongTu);
  const to = toNumber(job.LuongDen);

  if (from != null && to != null) return `${formatCount(from, locale)} - ${formatCount(to, locale)}`;
  if (from != null) return t('jobSearch.salary.shortFrom', { amount: formatCount(from, locale) });
  if (to != null) return t('jobSearch.salary.shortTo', { amount: formatCount(to, locale) });
  return t('jobSearch.salary.negotiable');
};

const getCardBadge = (job, t) => {
  const salaryTop = toNumber(job?.LuongDen) ?? toNumber(job?.LuongTu) ?? 0;
  if (salaryTop >= 30000000) return t('jobSearch.badges.goodSalary');

  if (String(job?.TrangThai || '').trim()) return t('jobSearch.badges.featured');
  return '';
};

const JobSearchPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { notify } = useNotification();
  const currentLocale = i18n.language?.startsWith('en') ? 'en-US' : 'vi-VN';

  const API_BASE = CLIENT_API_BASE;

  const jobsListRef = useRef(null);
  const industryRef = useRef(null);
  const locationRef = useRef(null);
  const companyFieldRef = useRef(null);
  const jobFieldRef = useRef(null);
  const locationSearchInputRef = useRef(null);

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [savedIds, setSavedIds] = useState([]);
  const savedSet = useMemo(() => new Set(savedIds.map((id) => String(id))), [savedIds]);

  const [provinces, setProvinces] = useState([]);

  const [keyword, setKeyword] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [isIndustryOpen, setIsIndustryOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isCompanyFieldOpen, setIsCompanyFieldOpen] = useState(false);
  const [isJobFieldOpen, setIsJobFieldOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');

  const [expAdv, setExpAdv] = useState(ADV_DEFAULTS.exp);
  const [levelAdv, setLevelAdv] = useState(ADV_DEFAULTS.level);
  const [salaryAdv, setSalaryAdv] = useState(ADV_DEFAULTS.salary);
  const [salaryFrom, setSalaryFrom] = useState(ADV_DEFAULTS.salaryFrom);
  const [salaryTo, setSalaryTo] = useState(ADV_DEFAULTS.salaryTo);
  const [companyField, setCompanyField] = useState(ADV_DEFAULTS.companyField);
  const [jobField, setJobField] = useState(ADV_DEFAULTS.jobField);
  const [workingForm, setWorkingForm] = useState(ADV_DEFAULTS.workingForm);

  useEffect(() => {
    let cancelled = false;

    const loadJobs = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`${API_BASE}/jobs`);
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(t('jobSearch.errors.loadJobs'));
        }

        if (!cancelled) setJobs(Array.isArray(data) ? data : []);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || t('jobSearch.errors.loadJobs'));
          setJobs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadJobs();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, t]);

  useEffect(() => {
    let cancelled = false;

    const loadSavedJobs = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setSavedIds([]);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/jobs/saved`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json().catch(() => []);
        if (!response.ok) throw new Error(t('jobSearch.errors.loadSavedJobs'));

        if (!cancelled) {
          setSavedIds(Array.isArray(data) ? data.map((item) => item.MaTin) : []);
        }
      } catch {
        if (!cancelled) setSavedIds([]);
      }
    };

    loadSavedJobs();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, t]);

  useEffect(() => {
    let cancelled = false;

    const loadProvinces = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/provinces`);
        const data = await response.json().catch(() => []);
        if (!response.ok || !Array.isArray(data)) return;

        const mapped = data.map(getProvinceLabel).map((value) => String(value || '').trim()).filter(Boolean);
        if (!cancelled) setProvinces(mapped);
      } catch {
        if (!cancelled) setProvinces([]);
      }
    };

    loadProvinces();
    return () => {
      cancelled = true;
    };
  }, [API_BASE]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (industryRef.current && !industryRef.current.contains(event.target)) {
        setIsIndustryOpen(false);
      }

      if (locationRef.current && !locationRef.current.contains(event.target)) {
        setIsLocationOpen(false);
      }

      if (companyFieldRef.current && !companyFieldRef.current.contains(event.target)) {
        setIsCompanyFieldOpen(false);
      }

      if (jobFieldRef.current && !jobFieldRef.current.contains(event.target)) {
        setIsJobFieldOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsIndustryOpen(false);
        setIsLocationOpen(false);
        setIsCompanyFieldOpen(false);
        setIsJobFieldOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isLocationOpen) return;
    requestAnimationFrame(() => {
      locationSearchInputRef.current?.focus();
    });
  }, [isLocationOpen]);

  const industryEntries = useMemo(() => {
    return buildIndustryEntries(jobs);
  }, [jobs]);

  const locationEntries = useMemo(() => {
    return buildLocationEntries(jobs, provinces);
  }, [jobs, provinces]);

  const visibleLocationEntries = useMemo(() => {
    const query = norm(locationQuery);
    if (!query) return locationEntries;

    return locationEntries.filter((entry) => entry.value === '' || norm(entry.label).includes(query));
  }, [locationEntries, locationQuery]);

  const fieldOptions = useMemo(() => {
    const values = industryEntries.slice(1).map((entry) => entry.label);
    return ['Tất cả lĩnh vực', ...values];
  }, [industryEntries]);

  const filteredJobs = useMemo(() => {
    const keywordNorm = norm(keyword);
    const customFrom = parseMillionVnd(salaryFrom);
    const customTo = parseMillionVnd(salaryTo);

    return jobs.filter((job) => {
      const careerNorm = norm([job?.LinhVucCongViec, job?.LinhVucCongTy].filter(Boolean).join(' '));
      const companyFieldRaw = job?.LinhVucCongTy || job?.LinhVuc || '';

      const matchKeyword = !keywordNorm
        || norm(job?.TieuDe).includes(keywordNorm)
        || norm(job?.TenCongTy).includes(keywordNorm)
        || careerNorm.includes(keywordNorm);

      const matchProvince = !selectedProvince || norm(job?.ThanhPho) === norm(selectedProvince);
      const matchCategory = !selectedCategory || careerNorm.includes(norm(selectedCategory));

      const matchExp = expAdv === 'Tất cả' || norm(job?.KinhNghiem) === norm(expAdv);
      const matchLevel = levelAdv === 'Tất cả' || norm(job?.CapBac) === norm(levelAdv);
      const matchJobField = jobField === 'Tất cả lĩnh vực' || careerNorm.includes(norm(jobField));
      const matchCompanyField = companyField === 'Tất cả lĩnh vực'
        || !companyFieldRaw
        || norm(companyFieldRaw).includes(norm(companyField));
      const matchWorkingForm = workingForm === 'Tất cả' || norm(job?.HinhThuc).includes(norm(workingForm));

      const matchSalaryPreset = salaryAdvMatches(job, salaryAdv);
      const matchSalaryCustom = salaryOverlap(job?.LuongTu, job?.LuongDen, customFrom, customTo);

      return matchKeyword
        && matchProvince
        && matchCategory
        && matchExp
        && matchLevel
        && matchJobField
        && matchCompanyField
        && matchWorkingForm
        && matchSalaryPreset
        && matchSalaryCustom;
    });
  }, [
    jobs,
    keyword,
    selectedProvince,
    selectedCategory,
    expAdv,
    levelAdv,
    salaryAdv,
    salaryFrom,
    salaryTo,
    companyField,
    jobField,
    workingForm
  ]);

  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      const aTs = Date.parse(a?.NgayDang || a?.NgayTao || a?.createdAt || '');
      const bTs = Date.parse(b?.NgayDang || b?.NgayTao || b?.createdAt || '');
      const safeATs = Number.isFinite(aTs) ? aTs : Number(a?.MaTin || 0);
      const safeBTs = Number.isFinite(bTs) ? bTs : Number(b?.MaTin || 0);
      return safeBTs - safeATs;
    });
  }, [filteredJobs]);

  const companyCount = useMemo(() => {
    return new Set(jobs.map((job) => String(job?.TenCongTy || '').trim()).filter(Boolean)).size;
  }, [jobs]);

  const isAdvancedDirty = useMemo(() => {
    return expAdv !== ADV_DEFAULTS.exp
      || levelAdv !== ADV_DEFAULTS.level
      || salaryAdv !== ADV_DEFAULTS.salary
      || salaryFrom !== ADV_DEFAULTS.salaryFrom
      || salaryTo !== ADV_DEFAULTS.salaryTo
      || companyField !== ADV_DEFAULTS.companyField
      || jobField !== ADV_DEFAULTS.jobField
      || workingForm !== ADV_DEFAULTS.workingForm;
  }, [expAdv, levelAdv, salaryAdv, salaryFrom, salaryTo, companyField, jobField, workingForm]);

  const currentDateLabel = useMemo(() => {
    return new Intl.DateTimeFormat(currentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date());
  }, [currentLocale]);

  const selectedIndustryLabel = selectedCategory || t('jobSearch.search.allIndustries');
  const selectedLocationLabel = selectedProvince || t('jobSearch.search.nationwide');

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setIsIndustryOpen(false);
    setIsLocationOpen(false);
    setIsCompanyFieldOpen(false);
    setIsJobFieldOpen(false);
    jobsListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resetAdvancedFilters = () => {
    setExpAdv(ADV_DEFAULTS.exp);
    setLevelAdv(ADV_DEFAULTS.level);
    setSalaryAdv(ADV_DEFAULTS.salary);
    setSalaryFrom(ADV_DEFAULTS.salaryFrom);
    setSalaryTo(ADV_DEFAULTS.salaryTo);
    setCompanyField(ADV_DEFAULTS.companyField);
    setJobField(ADV_DEFAULTS.jobField);
    setWorkingForm(ADV_DEFAULTS.workingForm);
  };

  const handleToggleSave = async (jobId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      notify({ type: 'error', message: t('jobSearch.notifications.loginRequiredToSave') });
      return;
    }

    const idStr = String(jobId);
    const isSaved = savedSet.has(idStr);

    try {
      const response = await fetch(`${API_BASE}/jobs/saved/${encodeURIComponent(idStr)}`, {
        method: isSaved ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error((data && data.error) || t('jobSearch.errors.updateSavedJob'));

      setSavedIds((prev) => {
        const next = new Set(prev.map((item) => String(item)));
        if (isSaved) next.delete(idStr);
        else next.add(idStr);
        return Array.from(next);
      });

      notify({
        type: 'success',
        message: isSaved ? t('jobSearch.notifications.unsavedJob') : t('jobSearch.notifications.savedJob')
      });
    } catch (toggleError) {
      notify({ type: 'error', message: toggleError.message || t('jobSearch.errors.updateSavedJob') });
    }
  };

  return (
    <div className="jf-job-search-page jf-job-search-page--modern">
      <section className="jf-jobs-modern-hero">
        <div className="container jf-jobs-modern-container">
          <div className="jf-jobs-modern-copy">
            <p className="jf-jobs-modern-eyebrow">{t('jobSearch.hero.eyebrow')}</p>
            <h1>{t('jobSearch.hero.title')}</h1>
            <p>
              {t('jobSearch.hero.description')}
            </p>
          </div>

          <form className="jf-jobs-modern-search" onSubmit={handleSearchSubmit}>
            <div className="jf-jobs-search-field jf-jobs-search-field--keyword">
              <label htmlFor="jobs-keyword">{t('jobSearch.search.keywordLabel')}</label>
              <div className="jf-jobs-search-input-wrap">
                <i className="bi bi-search"></i>
                <input
                  id="jobs-keyword"
                  type="text"
                  placeholder={t('jobSearch.search.keywordPlaceholder')}
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </div>
            </div>

            <div className="jf-jobs-search-field" ref={industryRef}>
              <label>{t('jobSearch.search.industryLabel')}</label>
              <div className={`jf-jobs-select ${isIndustryOpen ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="jf-jobs-select-trigger"
                  onClick={() => {
                    setIsIndustryOpen((prev) => !prev);
                    setIsLocationOpen(false);
                  }}
                  aria-haspopup="listbox"
                  aria-expanded={isIndustryOpen}
                >
                  <span className="jf-jobs-select-text">{selectedIndustryLabel}</span>
                  <i className="bi bi-chevron-down"></i>
                </button>

                {isIndustryOpen ? (
                  <div className="jf-jobs-select-menu" role="listbox" aria-label={t('jobSearch.search.selectIndustry')}>
                    {industryEntries.map((entry) => (
                      <button
                        key={entry.label}
                        type="button"
                        className={`jf-jobs-select-option ${selectedCategory === entry.value ? 'is-active' : ''}`}
                        onClick={() => {
                          setSelectedCategory(entry.value);
                          setIsIndustryOpen(false);
                        }}
                      >
                        {translateOptionLabel(entry.label, t)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="jf-jobs-search-field" ref={locationRef}>
              <label>{t('jobSearch.search.locationLabel')}</label>
              <div className={`jf-jobs-select ${isLocationOpen ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="jf-jobs-select-trigger"
                  onClick={() => {
                    setIsLocationOpen((prev) => !prev);
                    setIsIndustryOpen(false);
                    setLocationQuery('');
                  }}
                  aria-haspopup="listbox"
                  aria-expanded={isLocationOpen}
                >
                  <span className="jf-jobs-select-text">{selectedLocationLabel}</span>
                  <i className="bi bi-chevron-down"></i>
                </button>

                {isLocationOpen ? (
                  <div className="jf-jobs-select-menu jf-jobs-select-menu--location" role="listbox" aria-label={t('jobSearch.search.selectLocation')}>
                    <div className="jf-jobs-select-search-wrap">
                      <i className="bi bi-search"></i>
                      <input
                        ref={locationSearchInputRef}
                        type="text"
                        placeholder={t('jobSearch.search.locationSearchPlaceholder')}
                        value={locationQuery}
                        onChange={(event) => setLocationQuery(event.target.value)}
                      />
                    </div>

                    <div className="jf-jobs-select-scroll">
                      {visibleLocationEntries.length === 0 ? (
                        <div className="jf-jobs-select-empty">{t('jobSearch.search.noLocationFound')}</div>
                      ) : (
                        visibleLocationEntries.map((entry) => (
                          <button
                            key={`${entry.value || 'all'}-${entry.label}`}
                            type="button"
                            className={`jf-jobs-select-option ${selectedProvince === entry.value ? 'is-active' : ''}`}
                            onClick={() => {
                              setSelectedProvince(entry.value);
                              setIsLocationOpen(false);
                            }}
                          >
                            {translateOptionLabel(entry.label, t)}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <button type="submit" className="jf-jobs-search-submit">
              {t('jobSearch.search.submit')}
            </button>
          </form>

          <div className="jf-jobs-modern-stats">
            <div className="jf-jobs-modern-stat">
              <strong>{formatCount(filteredJobs.length, currentLocale)}+</strong>
              <span>{t('jobSearch.stats.matchedJobs')}</span>
            </div>
            <div className="jf-jobs-modern-stat">
              <strong>{formatCount(companyCount, currentLocale)}+</strong>
              <span>{t('jobSearch.stats.hiringCompanies')}</span>
            </div>
            <div className="jf-jobs-modern-stat">
              <strong>{formatCount(jobs.length, currentLocale)}+</strong>
              <span>{t('jobSearch.stats.newJobs')}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container jf-jobs-modern-container jf-jobs-modern-body">
        {error ? <div className="alert alert-danger mb-4">{error}</div> : null}

        <div className="row g-4 align-items-start">
          <aside className="col-lg-3">
            <div className="jf-jobs-filter-panel">
              <div className="jf-jobs-filter-header">
                <div>
                  <p>{t('jobSearch.filters.advanced')}</p>
                  <h2>{t('jobSearch.filters.refineSearch')}</h2>
                </div>
                <i className="bi bi-funnel"></i>
              </div>

              <div className="jf-jobs-filter-group">
                <h3>{t('jobSearch.filters.experience')}</h3>
                <div className="jf-jobs-radio-list">
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <label key={option} className="jf-jobs-radio-option">
                      <input
                        type="radio"
                        name="exp-adv"
                        checked={expAdv === option}
                        onChange={() => setExpAdv(option)}
                      />
                      <span>{translateOptionLabel(option, t)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="jf-jobs-filter-group">
                <h3>{t('jobSearch.filters.level')}</h3>
                <div className="jf-jobs-radio-list">
                  {LEVEL_OPTIONS.map((option) => (
                    <label key={option} className="jf-jobs-radio-option">
                      <input
                        type="radio"
                        name="level-adv"
                        checked={levelAdv === option}
                        onChange={() => setLevelAdv(option)}
                      />
                      <span>{translateOptionLabel(option, t)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="jf-jobs-filter-group">
                <h3>{t('jobSearch.filters.salary')}</h3>
                <div className="jf-jobs-radio-list">
                  {SALARY_OPTIONS.map((option) => (
                    <label key={option} className="jf-jobs-radio-option">
                      <input
                        type="radio"
                        name="salary-adv"
                        checked={salaryAdv === option}
                        onChange={() => setSalaryAdv(option)}
                      />
                      <span>{translateOptionLabel(option, t)}</span>
                    </label>
                  ))}
                </div>

                <div className="jf-jobs-salary-range">
                  <input
                    type="number"
                    className="jf-jobs-salary-input jf-jobs-salary-input--from"
                    placeholder={t('jobSearch.filters.salaryFrom')}
                    value={salaryFrom}
                    onChange={(event) => setSalaryFrom(event.target.value)}
                  />
                  <input
                    type="number"
                    className="jf-jobs-salary-input jf-jobs-salary-input--to"
                    placeholder={t('jobSearch.filters.salaryTo')}
                    value={salaryTo}
                    onChange={(event) => setSalaryTo(event.target.value)}
                  />
                  <span className="jf-jobs-salary-unit">{t('jobSearch.filters.millionUnit')}</span>
                </div>
              </div>

              <div className="jf-jobs-filter-group">
                <h3>{t('jobSearch.filters.companyField')}</h3>
                <div className={`jf-jobs-select jf-jobs-select--filter ${isCompanyFieldOpen ? 'is-open' : ''}`} ref={companyFieldRef}>
                  <button
                    type="button"
                    className="jf-jobs-select-trigger"
                    onClick={() => {
                      setIsCompanyFieldOpen((prev) => !prev);
                      setIsJobFieldOpen(false);
                      setIsIndustryOpen(false);
                      setIsLocationOpen(false);
                    }}
                    aria-haspopup="listbox"
                    aria-expanded={isCompanyFieldOpen}
                  >
                    <span className="jf-jobs-select-text">{translateOptionLabel(companyField, t)}</span>
                    <i className="bi bi-chevron-down"></i>
                  </button>

                  {isCompanyFieldOpen ? (
                    <div className="jf-jobs-select-menu" role="listbox" aria-label={t('jobSearch.filters.selectCompanyField')}>
                      <div className="jf-jobs-select-scroll">
                        {fieldOptions.map((option) => (
                          <button
                            key={`company-${option}`}
                            type="button"
                            className={`jf-jobs-select-option ${companyField === option ? 'is-active' : ''}`}
                            onClick={() => {
                              setCompanyField(option);
                              setIsCompanyFieldOpen(false);
                            }}
                          >
                            {translateOptionLabel(option, t)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="jf-jobs-filter-group">
                <h3>{t('jobSearch.filters.jobField')}</h3>
                <div className={`jf-jobs-select jf-jobs-select--filter ${isJobFieldOpen ? 'is-open' : ''}`} ref={jobFieldRef}>
                  <button
                    type="button"
                    className="jf-jobs-select-trigger"
                    onClick={() => {
                      setIsJobFieldOpen((prev) => !prev);
                      setIsCompanyFieldOpen(false);
                      setIsIndustryOpen(false);
                      setIsLocationOpen(false);
                    }}
                    aria-haspopup="listbox"
                    aria-expanded={isJobFieldOpen}
                  >
                    <span className="jf-jobs-select-text">{translateOptionLabel(jobField, t)}</span>
                    <i className="bi bi-chevron-down"></i>
                  </button>

                  {isJobFieldOpen ? (
                    <div className="jf-jobs-select-menu" role="listbox" aria-label={t('jobSearch.filters.selectJobField')}>
                      <div className="jf-jobs-select-scroll">
                        {fieldOptions.map((option) => (
                          <button
                            key={`job-${option}`}
                            type="button"
                            className={`jf-jobs-select-option ${jobField === option ? 'is-active' : ''}`}
                            onClick={() => {
                              setJobField(option);
                              setIsJobFieldOpen(false);
                            }}
                          >
                            {translateOptionLabel(option, t)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="jf-jobs-filter-group">
                <h3>{t('jobSearch.filters.workingForm')}</h3>
                <div className="jf-jobs-radio-list">
                  {WORKING_FORM_OPTIONS.map((option) => (
                    <label key={option} className="jf-jobs-radio-option">
                      <input
                        type="radio"
                        name="working-form"
                        checked={workingForm === option}
                        onChange={() => setWorkingForm(option)}
                      />
                      <span>{translateOptionLabel(option, t)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className={`jf-jobs-reset-btn ${isAdvancedDirty ? 'is-active' : ''}`}
                onClick={resetAdvancedFilters}
                disabled={!isAdvancedDirty}
              >
                {t('jobSearch.filters.clear')}
              </button>
            </div>
          </aside>

          <section className="col-lg-9" ref={jobsListRef}>
            <div className="jf-jobs-results-header">
              <div>
                <p className="jf-jobs-results-breadcrumb">{t('jobSearch.results.breadcrumb')}</p>
                <h2>
                  {t('jobSearch.results.matchCount', {
                    count: formatCount(sortedJobs.length, currentLocale)
                  })}
                  <span> {t('jobSearch.results.updatedAt', { date: currentDateLabel })}</span>
                </h2>
                <p className="jf-jobs-results-subline">
                  {t('jobSearch.results.subtitle')}
                </p>
              </div>

              <button type="button" className="jf-jobs-alert-btn" disabled>
                <i className="bi bi-bell"></i>
                {t('jobSearch.results.createAlert')}
              </button>
            </div>

            {loading ? (
              <div className="jf-jobs-state-card">{t('jobSearch.states.loading')}</div>
            ) : sortedJobs.length === 0 ? (
              <div className="jf-jobs-state-card">
                {t('jobSearch.states.empty')}
                {jobs.length > 0 ? (
                  <div className="mt-2">
                    <button type="button" className="jf-jobs-empty-reset" onClick={resetAdvancedFilters}>
                      {t('jobSearch.states.clearToSeeAll')}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="jf-jobs-results-list">
                {sortedJobs.map((job) => {
                  const isSaved = savedSet.has(String(job.MaTin));
                  const badge = getCardBadge(job, t);

                  return (
                    <article key={job.MaTin} className="jf-jobs-result-card">
                      <div className="jf-jobs-result-main">
                        <div className="jf-jobs-result-logo">
                          <img
                            src={job.Logo || '/images/logo.png'}
                            alt={job.TenCongTy || t('jobSearch.cards.logoAlt')}
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = '/images/logo.png';
                            }}
                          />
                        </div>

                        <div className="jf-jobs-result-content">
                          <div className="jf-jobs-result-title-row">
                            <button
                              type="button"
                              className="jf-jobs-result-title"
                              onClick={() => navigate(`/jobs/${job.MaTin}`)}
                            >
                              {job.TieuDe || t('jobSearch.cards.noTitle')}
                            </button>
                            {badge ? <span className="jf-jobs-result-badge">{badge}</span> : null}
                          </div>

                          <div className="jf-jobs-result-company">{job.TenCongTy || t('jobSearch.cards.employer')}</div>

                          <div className="jf-jobs-result-meta">
                            <span><i className="bi bi-geo-alt"></i>{job.ThanhPho || job.DiaDiem || t('jobSearch.search.nationwide')}</span>
                            <span><i className="bi bi-briefcase"></i>{job.HinhThuc || t('jobSearch.options.fullTime')}</span>
                            <span><i className="bi bi-person-workspace"></i>{job.KinhNghiem || t('jobSearch.options.notRequired')}</span>
                            <span><i className="bi bi-cash-coin"></i>{formatSalary(job, t, currentLocale)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="jf-jobs-result-side">
                        <span className="jf-jobs-result-time">{getPostedLabel(job, t)}</span>
                        <div className="jf-jobs-result-salary">{getNumericSalaryText(job, t, currentLocale)}</div>

                        <div className="jf-jobs-result-actions">
                          <button
                            type="button"
                            className={`jf-jobs-save-btn ${isSaved ? 'is-saved' : ''}`}
                            onClick={() => handleToggleSave(job.MaTin)}
                            title={isSaved ? t('jobSearch.actions.unsave') : t('jobSearch.actions.save')}
                            aria-label={isSaved ? t('jobSearch.actions.unsave') : t('jobSearch.actions.save')}
                          >
                            <i className={`bi ${isSaved ? 'bi-heart-fill' : 'bi-heart'}`}></i>
                          </button>

                          <button
                            type="button"
                            className="jf-jobs-apply-btn"
                            onClick={() => navigate(`/jobs/${job.MaTin}`)}
                          >
                            {t('jobSearch.actions.apply')}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default JobSearchPage;
