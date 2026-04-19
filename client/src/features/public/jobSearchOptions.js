export const COMMON_INDUSTRIES = [
  'Công nghệ thông tin',
  'Marketing',
  'Kinh doanh',
  'Kế toán',
  'Nhân sự',
  'Thiết kế',
  'Tài chính - Ngân hàng',
  'Chăm sóc khách hàng'
];

export const getProvinceLabel = (item) => {
  if (typeof item === 'string') return String(item || '').trim();
  return String(item?.TenTinh || item?.name || '').trim();
};

export const buildIndustryLabels = (jobs = []) => {
  const dynamic = jobs
    .map((job) => String(job?.LinhVucCongViec || job?.LinhVucCongTy || '').trim())
    .filter(Boolean);

  return [...new Set([...COMMON_INDUSTRIES, ...dynamic])];
};

export const buildIndustryEntries = (jobs = []) => [
  { value: '', label: 'Tất cả ngành nghề' },
  ...buildIndustryLabels(jobs).map((item) => ({ value: item, label: item }))
];

export const buildLocationLabels = (jobs = [], provinces = []) => {
  const fromJobs = jobs
    .map((job) => String(job?.ThanhPho || '').trim())
    .filter(Boolean);

  const normalizedProvinces = provinces.map(getProvinceLabel).filter(Boolean);
  return [...new Set([...normalizedProvinces, ...fromJobs])];
};

export const buildLocationEntries = (jobs = [], provinces = []) => [
  { value: '', label: 'Toàn quốc' },
  ...buildLocationLabels(jobs, provinces).map((item) => ({ value: item, label: item }))
];