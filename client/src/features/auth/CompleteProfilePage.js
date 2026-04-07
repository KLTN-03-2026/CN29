import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './components/AuthLayout';
import { API_BASE as CLIENT_API_BASE } from '../../config/apiBase';

const CANDIDATE_ROLE = 'Ứng viên';
const EMPLOYER_ROLE = 'Nhà tuyển dụng';

const readJsonStorage = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const toLines = (value) => Array.isArray(value) ? value.map((item) => String(item || '')).join('\n') : '';

const parseLines = (value) =>
  String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const apiBase = CLIENT_API_BASE;

  const token = String(localStorage.getItem('token') || '').trim();
  const currentUser = readJsonStorage('user', {});
  const prefill = useMemo(
    () => location.state?.prefill || readJsonStorage('pending_onboarding_prefill', {}),
    [location.state]
  );

  const roleFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const role = String(params.get('role') || '').trim().toLowerCase();
    if (role === 'employer') return EMPLOYER_ROLE;
    if (role === 'candidate') return CANDIDATE_ROLE;
    if (currentUser?.role === EMPLOYER_ROLE) return EMPLOYER_ROLE;
    if (currentUser?.role === CANDIDATE_ROLE) return CANDIDATE_ROLE;
    return '';
  }, [currentUser?.role, location.search]);

  const [role] = useState(roleFromQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [candidateForm, setCandidateForm] = useState({
    fullName: prefill.fullName || currentUser?.name || '',
    phone: prefill.phone || '',
    address: prefill.address || '',
    birthday: prefill.birthday || '',
    gender: prefill.gender || 'Nam',
    city: '',
    district: '',
    introHtml: '',
    experienceYears: 0,
    education: '',
    avatar: '',
    title: '',
    personalLink: '',
    educationListText: toLines(prefill.educationList),
    workListText: toLines(prefill.workList),
    languageListText: toLines(prefill.languageList)
  });

  const [employerForm, setEmployerForm] = useState({
    fullName: prefill.fullName || currentUser?.name || '',
    phone: prefill.phone || '',
    address: prefill.address || '',
    companyName: prefill.companyName || '',
    taxCode: '',
    website: '',
    city: '',
    description: '',
    logo: '',
    industry: ''
  });

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    if (!role || ![CANDIDATE_ROLE, EMPLOYER_ROLE].includes(role)) {
      navigate('/onboarding/role', { replace: true, state: { prefill } });
    }
  }, [navigate, prefill, role, token]);

  if (!token || !role || ![CANDIDATE_ROLE, EMPLOYER_ROLE].includes(role)) {
    return null;
  }

  const handleCandidateChange = (event) => {
    const { name, value } = event.target;
    setCandidateForm((prev) => ({
      ...prev,
      [name]: name === 'experienceYears' ? Number(value) : value
    }));
  };

  const handleEmployerChange = (event) => {
    const { name, value } = event.target;
    setEmployerForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    setLoading(true);
    try {
      let payload = {};

      if (role === CANDIDATE_ROLE) {
        if (!candidateForm.fullName || !candidateForm.phone || !candidateForm.birthday) {
          throw new Error('Vui lòng nhập đầy đủ họ tên, số điện thoại và ngày sinh.');
        }

        payload = {
          role,
          fullName: candidateForm.fullName,
          phone: candidateForm.phone,
          address: candidateForm.address,
          birthday: candidateForm.birthday,
          gender: candidateForm.gender,
          city: candidateForm.city,
          district: candidateForm.district,
          introHtml: candidateForm.introHtml,
          experienceYears: candidateForm.experienceYears,
          education: candidateForm.education,
          avatar: candidateForm.avatar,
          title: candidateForm.title,
          personalLink: candidateForm.personalLink,
          educationList: parseLines(candidateForm.educationListText),
          workList: parseLines(candidateForm.workListText),
          languageList: parseLines(candidateForm.languageListText)
        };
      } else {
        if (!employerForm.fullName || !employerForm.phone || !employerForm.companyName) {
          throw new Error('Vui lòng nhập đầy đủ họ tên, số điện thoại và tên công ty.');
        }

        payload = {
          role,
          fullName: employerForm.fullName,
          phone: employerForm.phone,
          address: employerForm.address,
          companyName: employerForm.companyName,
          taxCode: employerForm.taxCode,
          website: employerForm.website,
          city: employerForm.city,
          description: employerForm.description,
          logo: employerForm.logo,
          industry: employerForm.industry
        };
      }

      const response = await fetch(`${apiBase}/auth/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Không thể lưu hồ sơ.');
      }

      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      localStorage.removeItem('pending_onboarding_prefill');

      const defaultRedirect = role === EMPLOYER_ROLE ? '/employer' : '/profile';
      navigate(data.redirectTo || defaultRedirect, { replace: true });
    } catch (err) {
      setError(err.message || 'Không thể lưu hồ sơ.');
    } finally {
      setLoading(false);
    }
  };

  const isCandidate = role === CANDIDATE_ROLE;

  return (
    <AuthLayout
      mode="register"
      title={isCandidate ? 'Hoàn thiện hồ sơ ứng viên' : 'Hoàn thiện hồ sơ nhà tuyển dụng'}
      subtitle="Điền thông tin một lần để hệ thống đưa bạn vào đúng khu vực làm việc."
      switchText="Muốn đổi vai trò?"
      switchLabel="Chọn lại vai trò"
      switchTo="/onboarding/role"
      heroImage="/images/auth-career-hero.svg"
      heroTitle="Hoàn thiện hồ sơ để bắt đầu sử dụng hệ thống."
      heroSubtitle="Bạn có thể cập nhật thêm trong trang hồ sơ sau khi hoàn tất bước này."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {isCandidate ? (
          <>
            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateFullName">Họ tên</label>
                <input id="candidateFullName" name="fullName" className="auth-input" value={candidateForm.fullName} onChange={handleCandidateChange} required />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidatePhone">Số điện thoại</label>
                <input id="candidatePhone" name="phone" className="auth-input" value={candidateForm.phone} onChange={handleCandidateChange} required />
              </div>
            </div>

            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateBirthday">Ngày sinh</label>
                <input id="candidateBirthday" type="date" name="birthday" className="auth-input" value={candidateForm.birthday} onChange={handleCandidateChange} required />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateGender">Giới tính</label>
                <select id="candidateGender" name="gender" className="auth-select" value={candidateForm.gender} onChange={handleCandidateChange}>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>

            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateCity">Thành phố</label>
                <input id="candidateCity" name="city" className="auth-input" value={candidateForm.city} onChange={handleCandidateChange} />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateDistrict">Quận/Huyện</label>
                <input id="candidateDistrict" name="district" className="auth-input" value={candidateForm.district} onChange={handleCandidateChange} />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="candidateAddress">Địa chỉ</label>
              <input id="candidateAddress" name="address" className="auth-input" value={candidateForm.address} onChange={handleCandidateChange} />
            </div>

            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateTitle">Chức danh</label>
                <input id="candidateTitle" name="title" className="auth-input" value={candidateForm.title} onChange={handleCandidateChange} />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateExperience">Số năm kinh nghiệm</label>
                <input id="candidateExperience" type="number" min="0" name="experienceYears" className="auth-input" value={candidateForm.experienceYears} onChange={handleCandidateChange} />
              </div>
            </div>

            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateEducation">Trình độ học vấn</label>
                <input id="candidateEducation" name="education" className="auth-input" value={candidateForm.education} onChange={handleCandidateChange} />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateLink">Link cá nhân</label>
                <input id="candidateLink" name="personalLink" className="auth-input" value={candidateForm.personalLink} onChange={handleCandidateChange} />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="candidateAvatar">Ảnh đại diện (URL)</label>
              <input id="candidateAvatar" name="avatar" className="auth-input" value={candidateForm.avatar} onChange={handleCandidateChange} />
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="candidateIntro">Giới thiệu bản thân</label>
              <textarea id="candidateIntro" name="introHtml" className="auth-input" style={{ height: 100, paddingTop: 10 }} value={candidateForm.introHtml} onChange={handleCandidateChange} />
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="candidateEducationList">Danh sách học vấn (mỗi dòng 1 mục)</label>
              <textarea id="candidateEducationList" name="educationListText" className="auth-input" style={{ height: 90, paddingTop: 10 }} value={candidateForm.educationListText} onChange={handleCandidateChange} />
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="candidateWorkList">Danh sách kinh nghiệm (mỗi dòng 1 mục)</label>
              <textarea id="candidateWorkList" name="workListText" className="auth-input" style={{ height: 90, paddingTop: 10 }} value={candidateForm.workListText} onChange={handleCandidateChange} />
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="candidateLanguageList">Danh sách ngoại ngữ (mỗi dòng 1 mục)</label>
              <textarea id="candidateLanguageList" name="languageListText" className="auth-input" style={{ height: 90, paddingTop: 10 }} value={candidateForm.languageListText} onChange={handleCandidateChange} />
            </div>
          </>
        ) : (
          <>
            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerFullName">Họ tên người đại diện</label>
                <input id="employerFullName" name="fullName" className="auth-input" value={employerForm.fullName} onChange={handleEmployerChange} required />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerPhone">Số điện thoại</label>
                <input id="employerPhone" name="phone" className="auth-input" value={employerForm.phone} onChange={handleEmployerChange} required />
              </div>
            </div>

            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerCompanyName">Tên công ty</label>
                <input id="employerCompanyName" name="companyName" className="auth-input" value={employerForm.companyName} onChange={handleEmployerChange} required />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerTaxCode">Mã số thuế</label>
                <input id="employerTaxCode" name="taxCode" className="auth-input" value={employerForm.taxCode} onChange={handleEmployerChange} />
              </div>
            </div>

            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerCity">Thành phố</label>
                <input id="employerCity" name="city" className="auth-input" value={employerForm.city} onChange={handleEmployerChange} />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerIndustry">Lĩnh vực</label>
                <input id="employerIndustry" name="industry" className="auth-input" value={employerForm.industry} onChange={handleEmployerChange} />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="employerAddress">Địa chỉ</label>
              <input id="employerAddress" name="address" className="auth-input" value={employerForm.address} onChange={handleEmployerChange} />
            </div>

            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerWebsite">Website</label>
                <input id="employerWebsite" name="website" className="auth-input" value={employerForm.website} onChange={handleEmployerChange} />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerLogo">Logo (URL)</label>
                <input id="employerLogo" name="logo" className="auth-input" value={employerForm.logo} onChange={handleEmployerChange} />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="employerDescription">Mô tả công ty</label>
              <textarea id="employerDescription" name="description" className="auth-input" style={{ height: 120, paddingTop: 10 }} value={employerForm.description} onChange={handleEmployerChange} />
            </div>
          </>
        )}

        {error ? <div className="auth-error-banner">{error}</div> : null}

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading ? 'Đang lưu...' : 'Hoàn tất'}
          <i className="bi bi-arrow-right"></i>
        </button>
      </form>
    </AuthLayout>
  );
};

export default CompleteProfilePage;
