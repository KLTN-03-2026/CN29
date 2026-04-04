import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../components/NotificationProvider';
import { API_BASE as CLIENT_API_BASE } from '../../config/apiBase';
import HomeHero from './home/HomeHero';
import LatestJobsSection from './home/LatestJobsSection';
import CVBuilderCTA from './home/CVBuilderCTA';
import HowItWorksSection from './home/HowItWorksSection';
import TrustBenefitsSection from './home/TrustBenefitsSection';
import './home/HomePage.css';

const COUNT_FORMAT = new Intl.NumberFormat('vi-VN');

const QUICK_FILTER_OPTIONS = [
  { key: 'remote', label: 'Remote' },
  { key: 'fresher', label: 'Fresher' },
  { key: 'parttime', label: 'Part-time' },
  { key: 'fulltime', label: 'Full-time' },
  { key: 'intern', label: 'Intern' }
];

const TOOLBAR_FILTER_OPTIONS = [
  { key: 'latest', label: 'Mới nhất' },
  { key: 'highSalary', label: 'Lương cao' },
  { key: 'remote', label: 'Remote' },
  { key: 'intern', label: 'Thực tập' },
  { key: 'it', label: 'IT' }
];

const COMMON_INDUSTRIES = [
  'Công nghệ thông tin',
  'Marketing',
  'Kinh doanh',
  'Kế toán',
  'Thiết kế',
  'Chăm sóc khách hàng',
  'Nhân sự',
  'Tài chính - Ngân hàng'
];

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

const getSalaryText = (job) => {
  const type = String(job?.KieuLuong || 'Thỏa thuận');
  const from = toNumber(job?.LuongTu);
  const to = toNumber(job?.LuongDen);

  if (type === 'Thỏa thuận' || (from === null && to === null)) return 'Thỏa thuận';

  const salaryUnit = type.toLowerCase();
  if (from !== null && to !== null) {
    return `${COUNT_FORMAT.format(from)} - ${COUNT_FORMAT.format(to)} VND/${salaryUnit}`;
  }
  if (from !== null) {
    return `Từ ${COUNT_FORMAT.format(from)} VND/${salaryUnit}`;
  }
  if (to !== null) {
    return `Đến ${COUNT_FORMAT.format(to)} VND/${salaryUnit}`;
  }
  return 'Thỏa thuận';
};

const getPostedLabel = (job) => {
  const ts = getJobTimestamp(job);
  if (!ts) return 'Vừa đăng';
  const diffMs = Date.now() - ts;
  if (diffMs <= 0) return 'Vừa đăng';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Vừa đăng';
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 30) return `${diffDays} ngày trước`;
  return 'Đã đăng lâu';
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

const getHighlightBadge = (job) => {
  if (isRemoteJob(job)) return 'Remote';
  if (isInternJob(job)) return 'Thực tập';

  const salary = getSalaryUpperBound(job);
  if (salary >= 30000000) return 'Lương tốt';

  const timestamp = getJobTimestamp(job);
  const dayDiff = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  if (dayDiff <= 2) return 'Mới';

  if (String(job?.TrangThai || '').trim()) return 'Nổi bật';
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
          throw new Error('Không thể tải danh sách việc làm');
        }

        if (!cancelled) setJobs(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!cancelled) {
          setJobError(error.message || 'Không thể tải danh sách việc làm.');
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
  }, []);

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
          throw new Error('Không tải được việc làm đã lưu');
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
  }, []);

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
    const dynamic = jobs
      .map((job) => job?.LinhVucCongViec || job?.LinhVucCongTy || '')
      .filter(Boolean);

    const merged = [...COMMON_INDUSTRIES, ...dynamic]
      .map((value) => String(value).trim())
      .filter(Boolean);

    return [...new Set(merged)];
  }, [jobs]);

  const locations = useMemo(() => {
    const fromJobs = jobs
      .map((job) => job?.ThanhPho || '')
      .filter(Boolean)
      .map((item) => String(item).trim());

    const merged = [...provinces, ...fromJobs].filter(Boolean);
    return [...new Set(merged)];
  }, [jobs, provinces]);

  const trustStats = useMemo(() => {
    const openJobs = jobs.length > 0 ? `${COUNT_FORMAT.format(jobs.length)}+` : '1.200+';
    const companyCount = new Set(jobs.map((job) => String(job?.TenCongTy || '').trim()).filter(Boolean)).size;
    const companies = companyCount > 0 ? `${COUNT_FORMAT.format(companyCount)}+` : '350+';

    return [
      { label: 'Việc làm đang tuyển', value: openJobs },
      { label: 'Công ty tuyển dụng', value: companies },
      { label: 'Ứng viên hoạt động', value: '85.000+' },
      { label: 'CV đã tạo', value: '120.000+' }
    ];
  }, [jobs]);

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
      notify({ type: 'error', message: 'Bạn cần đăng nhập để lưu công việc.' });
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
        throw new Error((data && data.error) || 'Không thể cập nhật lưu việc');
      }

      setSavedIds((prev) => {
        const next = new Set(prev.map((item) => String(item)));
        if (currentlySaved) next.delete(idText);
        else next.add(idText);
        return Array.from(next);
      });

      notify({
        type: 'success',
        message: currentlySaved ? 'Đã bỏ lưu công việc.' : 'Đã lưu công việc.'
      });
    } catch (error) {
      notify({ type: 'error', message: error.message || 'Không thể cập nhật lưu việc.' });
    }
  };

  return (
    <div className="home-page">
      <HomeHero
        searchForm={searchForm}
        industries={industries}
        locations={locations}
        quickFilters={QUICK_FILTER_OPTIONS}
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
            toolbarOptions={TOOLBAR_FILTER_OPTIONS}
            activeToolbar={toolbarFilter}
            onToolbarChange={handleToolbarChange}
            onToggleSave={toggleSaveJob}
            onOpenJob={handleOpenJob}
            onApplyJob={handleApplyJob}
            onViewAllJobs={handleViewAllJobs}
            formatSalary={getSalaryText}
            getPostedLabel={getPostedLabel}
            getHighlightBadge={getHighlightBadge}
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
