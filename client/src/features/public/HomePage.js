import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../components/NotificationProvider';
import { API_BASE as CLIENT_API_BASE } from '../../config/apiBase';
import HomeHero from './home/HomeHero';
import LatestJobsSection from './home/LatestJobsSection';
import CVBuilderCTA from './home/CVBuilderCTA';
import HowItWorksSection from './home/HowItWorksSection';
import TrustBenefitsSection from './home/TrustBenefitsSection';
import { buildIndustryLabels, buildLocationLabels } from './jobSearchOptions';
import './home/HomePage.css';

const DEFAULT_NUMBER_LOCALE = 'vi-VN';
const formatCount = (value, locale = DEFAULT_NUMBER_LOCALE) => new Intl.NumberFormat(locale).format(Number(value) || 0);

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const getJobIdNumber = (job) => {
  const raw = job?.MaTin ?? job?.id;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
};

const getJobTimestamp = (job) => {
  const candidates = [job?.NgayDang, job?.NgayTao, job?.createdAt];
  for (const value of candidates) {
    if (!value) continue;
    const ts = Date.parse(value);
    if (Number.isFinite(ts)) return ts;
  }
  return getJobIdNumber(job);
};

const getSalaryUpperBound = (job) => {
  const to = toNumber(job?.LuongDen);
  const from = toNumber(job?.LuongTu);
  return to ?? from ?? 0;
};

const resolveSalaryUnitLabel = (rawUnit, t) => {
  const unit = String(rawUnit || '').trim().toLowerCase();
  const normalizedUnit = unit
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalizedUnit.includes('thang') || normalizedUnit.includes('month')) {
    return t('home.common.salaryUnit.month');
  }

  if (normalizedUnit.includes('ngay') || normalizedUnit.includes('day')) {
    return t('home.common.salaryUnit.day');
  }

  if (normalizedUnit.includes('gio') || normalizedUnit.includes('hour')) {
    return t('home.common.salaryUnit.hour');
  }

  return t('home.common.salaryUnit.job');
};

const getSalaryText = (job, { t, locale = DEFAULT_NUMBER_LOCALE } = {}) => {
  const translate = typeof t === 'function' ? t : (key, options) => options?.defaultValue || key;
  const type = String(job?.KieuLuong || 'Thỏa thuận');
  const from = toNumber(job?.LuongTu);
  const to = toNumber(job?.LuongDen);
  const salaryUnit = resolveSalaryUnitLabel(type, translate);

  if (type === 'Thỏa thuận' || (from === null && to === null)) {
    return translate('home.common.salaryNegotiable', { defaultValue: 'Thỏa thuận' });
  }

  if (from !== null && to !== null) {
    return translate('home.common.salaryRange', {
      from: formatCount(from, locale),
      to: formatCount(to, locale),
      unit: salaryUnit,
      defaultValue: `${formatCount(from, locale)} - ${formatCount(to, locale)} VND/${salaryUnit}`
    });
  }

  if (from !== null) {
    return translate('home.common.salaryFrom', {
      amount: formatCount(from, locale),
      unit: salaryUnit,
      defaultValue: `Từ ${formatCount(from, locale)} VND/${salaryUnit}`
    });
  }

  if (to !== null) {
    return translate('home.common.salaryTo', {
      amount: formatCount(to, locale),
      unit: salaryUnit,
      defaultValue: `Đến ${formatCount(to, locale)} VND/${salaryUnit}`
    });
  }

  return translate('home.common.salaryNegotiable', { defaultValue: 'Thỏa thuận' });
};

const getPostedLabel = (job, t) => {
  const translate = typeof t === 'function' ? t : (key, options) => options?.defaultValue || key;
  const ts = getJobTimestamp(job);
  if (!ts) return translate('home.common.justPosted', { defaultValue: 'Vừa đăng' });
  const diffMs = Date.now() - ts;
  if (diffMs <= 0) return translate('home.common.justPosted', { defaultValue: 'Vừa đăng' });

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return translate('home.common.justPosted', { defaultValue: 'Vừa đăng' });
  if (diffHours < 24) {
    return translate('home.common.hoursAgo', {
      count: diffHours,
      defaultValue: `${diffHours} giờ trước`
    });
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 30) {
    return translate('home.common.daysAgo', {
      count: diffDays,
      defaultValue: `${diffDays} ngày trước`
    });
  }

  return translate('home.common.postedLong', { defaultValue: 'Đã đăng lâu' });
};

const isRemoteJob = (job) => {
  const content = normalizeText([
    job?.HinhThuc,
    job?.DiaDiem,
    job?.TieuDe,
    job?.MoTa
  ].join(' '));

  return content.includes('remote')
    || content.includes('từ xa')
    || content.includes('work from home')
    || content.includes('hybrid');
};

const isInternJob = (job) => {
  const content = normalizeText([
    job?.HinhThuc,
    job?.TieuDe,
    job?.KinhNghiem
  ].join(' '));
  return content.includes('thực tập') || content.includes('intern');
};

const isItJob = (job) => {
  const content = normalizeText([
    job?.LinhVucCongViec,
    job?.TieuDe,
    job?.MoTa
  ].join(' '));

  return content.includes('it')
    || content.includes('công nghệ')
    || content.includes('developer')
    || content.includes('software')
    || content.includes('lập trình')
    || content.includes('data');
};

const matchQuickFilter = (job, quickKey) => {
  if (!quickKey) return true;
  const content = normalizeText([
    job?.HinhThuc,
    job?.KinhNghiem,
    job?.TieuDe
  ].join(' '));

  switch (quickKey) {
    case 'remote':
      return isRemoteJob(job);
    case 'fresher':
      return content.includes('fresher')
        || content.includes('junior')
        || content.includes('mới tốt nghiệp')
        || content.includes('không yêu cầu')
        || content.includes('dưới 1 năm');
    case 'parttime':
      return content.includes('bán thời gian') || content.includes('part-time');
    case 'fulltime':
      return content.includes('toàn thời gian') || content.includes('full-time');
    case 'intern':
      return isInternJob(job);
    default:
      return true;
  }
};

const getHighlightBadge = (job, t) => {
  const translate = typeof t === 'function' ? t : (key, options) => options?.defaultValue || key;

  if (isRemoteJob(job)) return translate('home.common.badge.remote', { defaultValue: 'Remote' });
  if (isInternJob(job)) return translate('home.common.badge.internship', { defaultValue: 'Thực tập' });

  const salary = getSalaryUpperBound(job);
  if (salary >= 30000000) return translate('home.common.badge.goodSalary', { defaultValue: 'Lương tốt' });

  const timestamp = getJobTimestamp(job);
  const dayDiff = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  if (dayDiff <= 2) return translate('home.common.badge.new', { defaultValue: 'Mới' });

  if (String(job?.TrangThai || '').trim()) return translate('home.common.badge.featured', { defaultValue: 'Nổi bật' });
  return '';
};

const withLatestOrder = (list) => {
  return [...list].sort((a, b) => {
    const diff = getJobTimestamp(b) - getJobTimestamp(a);
    if (diff !== 0) return diff;
    return getJobIdNumber(b) - getJobIdNumber(a);
  });
};

const HomePage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { notify } = useNotification();
  const jobsSectionRef = useRef(null);

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobError, setJobError] = useState('');

  const [savedIds, setSavedIds] = useState([]);
  const [provinces, setProvinces] = useState([]);

  const [searchForm, setSearchForm] = useState({
    keyword: '',
    industry: '',
    location: ''
  });
  const [quickFilter, setQuickFilter] = useState('');
  const [toolbarFilter, setToolbarFilter] = useState('latest');

  const currentLocale = String(i18n.resolvedLanguage || i18n.language || 'vi').startsWith('en')
    ? 'en-US'
    : 'vi-VN';

  const quickFilterOptions = useMemo(() => ([
    { key: 'remote', label: t('home.filters.quick.remote') },
    { key: 'fresher', label: t('home.filters.quick.fresher') },
    { key: 'parttime', label: t('home.filters.quick.parttime') },
    { key: 'fulltime', label: t('home.filters.quick.fulltime') },
    { key: 'intern', label: t('home.filters.quick.intern') }
  ]), [i18n.language, t]);

  const toolbarFilterOptions = useMemo(() => ([
    { key: 'latest', label: t('home.filters.toolbar.latest') },
    { key: 'highSalary', label: t('home.filters.toolbar.highSalary') },
    { key: 'remote', label: t('home.filters.toolbar.remote') },
    { key: 'intern', label: t('home.filters.toolbar.intern') },
    { key: 'it', label: t('home.filters.toolbar.it') }
  ]), [i18n.language, t]);

  const savedSet = useMemo(() => new Set(savedIds.map((id) => String(id))), [savedIds]);

  useEffect(() => {
    let cancelled = false;

    const loadJobs = async () => {
      setLoadingJobs(true);
      setJobError('');
      try {
        const response = await fetch(`${CLIENT_API_BASE}/jobs`);
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(t('home.notifications.cannotLoadJobs'));
        }

        if (!cancelled) setJobs(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!cancelled) {
          setJobError(error.message || t('home.notifications.cannotLoadJobsGeneric'));
          setJobs([]);
        }
      } finally {
        if (!cancelled) setLoadingJobs(false);
      }
    };

    loadJobs();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    const loadSavedJobs = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setSavedIds([]);
        return;
      }

      try {
        const response = await fetch(`${CLIENT_API_BASE}/jobs/saved`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(t('home.notifications.cannotLoadSavedJobs'));
        }
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
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    const loadProvinces = async () => {
      try {
        const response = await fetch(`${CLIENT_API_BASE}/api/provinces`);
        const data = await response.json().catch(() => []);
        if (!response.ok || !Array.isArray(data)) return;

        const mapped = data
          .map((item) => {
            if (typeof item === 'string') return item;
            return item?.TenTinh || item?.name || '';
          })
          .filter(Boolean);

        if (!cancelled) setProvinces(mapped);
      } catch {
        if (!cancelled) setProvinces([]);
      }
    };

    loadProvinces();
    return () => {
      cancelled = true;
    };
  }, []);

  const industries = useMemo(() => {
    return buildIndustryLabels(jobs);
  }, [jobs]);

  const locations = useMemo(() => {
    return buildLocationLabels(jobs, provinces);
  }, [jobs, provinces]);

  const trustStats = useMemo(() => {
    const openJobs = jobs.length > 0 ? `${formatCount(jobs.length, currentLocale)}+` : '1.200+';
    const companyCount = new Set(jobs.map((job) => String(job?.TenCongTy || '').trim()).filter(Boolean)).size;
    const companies = companyCount > 0 ? `${formatCount(companyCount, currentLocale)}+` : '350+';

    return [
      { label: t('home.stats.openJobs'), value: openJobs },
      { label: t('home.stats.companies'), value: companies },
      { label: t('home.stats.activeCandidates'), value: '85.000+' },
      { label: t('home.stats.createdCvs'), value: '120.000+' }
    ];
  }, [currentLocale, jobs, t]);

  const searchedJobs = useMemo(() => {
    const keyword = normalizeText(searchForm.keyword);
    const industry = normalizeText(searchForm.industry);
    const location = normalizeText(searchForm.location);

    return jobs.filter((job) => {
      const title = normalizeText(job?.TieuDe);
      const company = normalizeText(job?.TenCongTy);
      const jobIndustry = normalizeText(job?.LinhVucCongViec || job?.LinhVucCongTy);
      const city = normalizeText(job?.ThanhPho);
      const fullAddress = normalizeText(job?.DiaDiem);

      const matchKeyword = !keyword || title.includes(keyword) || company.includes(keyword);
      const matchIndustry = !industry || jobIndustry.includes(industry);
      const matchLocation = !location || city.includes(location) || fullAddress.includes(location);
      const matchQuick = matchQuickFilter(job, quickFilter);

      return matchKeyword && matchIndustry && matchLocation && matchQuick;
    });
  }, [jobs, searchForm, quickFilter]);

  const sortedJobs = useMemo(() => {
    if (toolbarFilter === 'highSalary') {
      return [...searchedJobs].sort((a, b) => getSalaryUpperBound(b) - getSalaryUpperBound(a));
    }

    if (toolbarFilter === 'remote') {
      return withLatestOrder(searchedJobs.filter((job) => isRemoteJob(job)));
    }

    if (toolbarFilter === 'intern') {
      return withLatestOrder(searchedJobs.filter((job) => isInternJob(job)));
    }

    if (toolbarFilter === 'it') {
      return withLatestOrder(searchedJobs.filter((job) => isItJob(job)));
    }

    return withLatestOrder(searchedJobs);
  }, [searchedJobs, toolbarFilter]);

  const jobsForFeed = useMemo(() => sortedJobs.slice(0, 8), [sortedJobs]);

  const handleSearchFieldChange = (field, value) => {
    setSearchForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (jobsSectionRef.current) {
      jobsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleQuickFilterChange = (value) => {
    setQuickFilter((prev) => (prev === value ? '' : value));
    if (jobsSectionRef.current) {
      jobsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleToolbarChange = (value) => {
    setToolbarFilter(value);
  };

  const handleOpenJob = (job) => {
    navigate(`/jobs/${job.MaTin}`);
  };

  const handleApplyJob = (job) => {
    navigate(`/jobs/${job.MaTin}`);
  };

  const handleViewAllJobs = () => {
    const params = new URLSearchParams();
    if (searchForm.keyword) params.set('keyword', searchForm.keyword);
    if (searchForm.industry) params.set('industry', searchForm.industry);
    if (searchForm.location) params.set('location', searchForm.location);
    if (quickFilter) params.set('quick', quickFilter);

    const query = params.toString();
    navigate(query ? `/jobs?${query}` : '/jobs');
  };

  const toggleSaveJob = async (jobId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      notify({ type: 'error', message: t('home.notifications.loginToSave') });
      return;
    }

    const idText = String(jobId);
    const currentlySaved = savedSet.has(idText);

    try {
      const response = await fetch(`${CLIENT_API_BASE}/jobs/saved/${encodeURIComponent(idText)}`, {
        method: currentlySaved ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error((data && data.error) || t('home.notifications.cannotUpdateSaved'));
      }

      setSavedIds((prev) => {
        const next = new Set(prev.map((item) => String(item)));
        if (currentlySaved) next.delete(idText);
        else next.add(idText);
        return Array.from(next);
      });

      notify({
        type: 'success',
        message: currentlySaved ? t('home.notifications.unsaved') : t('home.notifications.saved')
      });
    } catch (error) {
      notify({ type: 'error', message: error.message || t('home.notifications.cannotUpdateSavedGeneric') });
    }
  };

  return (
    <div className="home-page">
      <HomeHero
        searchForm={searchForm}
        industries={industries}
        locations={locations}
        quickFilters={quickFilterOptions}
        activeQuickFilter={quickFilter}
        trustStats={trustStats}
        onSearchFieldChange={handleSearchFieldChange}
        onSearchSubmit={handleSearchSubmit}
        onQuickFilterChange={handleQuickFilterChange}
      />

      <main className="home-main-content">
        <div ref={jobsSectionRef}>
          <LatestJobsSection
            jobs={jobsForFeed}
            totalJobs={sortedJobs.length}
            loading={loadingJobs}
            error={jobError}
            savedSet={savedSet}
            toolbarOptions={toolbarFilterOptions}
            activeToolbar={toolbarFilter}
            onToolbarChange={handleToolbarChange}
            onToggleSave={toggleSaveJob}
            onOpenJob={handleOpenJob}
            onApplyJob={handleApplyJob}
            onViewAllJobs={handleViewAllJobs}
            formatSalary={(job) => getSalaryText(job, { t, locale: currentLocale })}
            getPostedLabel={(job) => getPostedLabel(job, t)}
            getHighlightBadge={(job) => getHighlightBadge(job, t)}
          />
        </div>

        <CVBuilderCTA />
        <HowItWorksSection />
        <TrustBenefitsSection />
      </main>
    </div>
  );
};

export default HomePage;
