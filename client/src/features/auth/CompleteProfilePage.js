import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthLayout from './components/AuthLayout';
import { API_BASE as CLIENT_API_BASE } from '../../config/apiBase';
import CalendarDatePicker from '../../components/date/CalendarDatePicker';

const CANDIDATE_ROLE = 'Ứng viên';
const EMPLOYER_ROLE = 'Nhà tuyển dụng';
const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024;

const pad2 = (value) => String(value).padStart(2, '0');

const normalizeIsoDate = (value) => {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';

  const [yearRaw, monthRaw, dayRaw] = text.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return '';
  }

  if (month < 1 || month > 12) {
    return '';
  }

  const maxDay = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDay) {
    return '';
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
};

const formatIsoDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const resolveUserId = (user) => {
  const candidate = user?.id || user?.MaNguoiDung || user?.userId || user?.maNguoiDung;
  const normalized = Number.parseInt(candidate, 10);
  return Number.isFinite(normalized) ? normalized : null;
};

const readJsonStorage = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
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
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const previewObjectUrlRef = useRef('');
  const maxBirthdayDate = useMemo(() => formatIsoDate(new Date()), []);

  const initialBirthday = useMemo(
    () => normalizeIsoDate(prefill.birthday),
    [prefill.birthday]
  );

  const [candidateForm, setCandidateForm] = useState({
    fullName: prefill.fullName || currentUser?.name || '',
    phone: prefill.phone || '',
    address: prefill.address || '',
    birthday: initialBirthday,
    gender: prefill.gender || 'Nam',
    city: '',
    district: '',
    introHtml: '',
    experienceYears: 0,
    education: '',
    avatar: String(prefill.avatar || currentUser?.avatarAbsoluteUrl || currentUser?.avatar || currentUser?.avatarUrl || currentUser?.AnhDaiDien || '').trim(),
    title: '',
    personalLink: ''
  });

  const [avatarPreview, setAvatarPreview] = useState(candidateForm.avatar);

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

  useEffect(() => {
    setCandidateForm((prev) => ({
      ...prev,
      birthday: initialBirthday
    }));
  }, [initialBirthday]);

  useEffect(() => () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
  }, []);

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

  const handleBirthdayChange = (nextBirthday) => {
    setCandidateForm((prev) => ({
      ...prev,
      birthday: nextBirthday
    }));
  };

  const handleAvatarFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');

    if (!file.type.startsWith('image/')) {
      setError(t('authPages.completeProfile.errors.invalidAvatarFile'));
      setAvatarFile(null);
      setAvatarInputKey((prev) => prev + 1);
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setError(t('authPages.completeProfile.errors.avatarTooLarge'));
      setAvatarFile(null);
      setAvatarInputKey((prev) => prev + 1);
      return;
    }

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = '';
    }

    const objectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objectUrl;
    setAvatarFile(file);
    setAvatarPreview(objectUrl);
  };

  const clearAvatarSelection = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = '';
    }

    setAvatarFile(null);
    setAvatarPreview('');
    setAvatarInputKey((prev) => prev + 1);
    setCandidateForm((prev) => ({ ...prev, avatar: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    setLoading(true);
    try {
      let payload = {};

      if (role === CANDIDATE_ROLE) {
        if (!candidateForm.fullName || !candidateForm.phone || !candidateForm.birthday) {
          throw new Error(t('authPages.completeProfile.errors.candidateRequiredFields'));
        }

        let resolvedAvatar = String(candidateForm.avatar || '').trim();

        if (avatarFile) {
          const userId = resolveUserId(currentUser);
          if (!userId) {
            throw new Error(t('authPages.completeProfile.errors.missingUserForAvatarUpload'));
          }

          const avatarBody = new FormData();
          avatarBody.append('avatar', avatarFile);
          avatarBody.append('userId', String(userId));

          const avatarResponse = await fetch('/users/upload-avatar', {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: avatarBody
          });

          const avatarData = await avatarResponse.json().catch(() => ({}));
          if (!avatarResponse.ok || !avatarData.success) {
            throw new Error(avatarData.error || t('authPages.completeProfile.errors.uploadAvatarFailed'));
          }

          resolvedAvatar = String(avatarData.absoluteUrl || avatarData.avatarUrl || '').trim();
          setCandidateForm((prev) => ({ ...prev, avatar: resolvedAvatar }));
          setAvatarPreview(resolvedAvatar);
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
          avatar: resolvedAvatar,
          title: candidateForm.title,
          personalLink: candidateForm.personalLink
        };
      } else {
        if (!employerForm.fullName || !employerForm.phone || !employerForm.companyName) {
          throw new Error(t('authPages.completeProfile.errors.employerRequiredFields'));
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
        throw new Error(data.error || t('authPages.completeProfile.errors.saveProfileFailed'));
      }

      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      localStorage.removeItem('pending_onboarding_prefill');

      const defaultRedirect = role === EMPLOYER_ROLE ? '/employer' : '/profile';
      navigate(data.redirectTo || defaultRedirect, { replace: true });
    } catch (err) {
      setError(err.message || t('authPages.completeProfile.errors.saveProfileFailed'));
    } finally {
      setLoading(false);
    }
  };

  const isCandidate = role === CANDIDATE_ROLE;

  return (
    <AuthLayout
      mode="register"
      title={isCandidate ? t('authPages.completeProfile.candidateTitle') : t('authPages.completeProfile.employerTitle')}
      subtitle={t('authPages.completeProfile.subtitle')}
      switchText={t('authPages.completeProfile.switchText')}
      switchLabel={t('authPages.completeProfile.switchLabel')}
      switchTo="/onboarding/role"
      heroImage="/images/auth-career-hero.svg"
      heroTitle={t('authPages.completeProfile.heroTitle')}
      heroSubtitle={t('authPages.completeProfile.heroSubtitle')}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {isCandidate ? (
          <>
            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateFullName">{t('authPages.completeProfile.labels.fullName')}</label>
                <input id="candidateFullName" name="fullName" className="auth-input" value={candidateForm.fullName} onChange={handleCandidateChange} required />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidatePhone">{t('authPages.completeProfile.labels.phone')}</label>
                <input id="candidatePhone" name="phone" className="auth-input" value={candidateForm.phone} onChange={handleCandidateChange} required />
              </div>
            </div>

            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateBirthday">{t('authPages.completeProfile.labels.birthday')}</label>
                <div className="auth-birthday-grid">
                  <CalendarDatePicker
                    id="candidateBirthday"
                    value={candidateForm.birthday}
                    onChange={handleBirthdayChange}
                    placeholder={t('authPages.completeProfile.placeholders.birthday')}
                    maxDate={maxBirthdayDate}
                    inputClassName="auth-input"
                  />
                </div>
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateGender">{t('authPages.completeProfile.labels.gender')}</label>
                <select id="candidateGender" name="gender" className="auth-select" value={candidateForm.gender} onChange={handleCandidateChange}>
                  <option value="Nam">{t('authPages.completeProfile.gender.male')}</option>
                  <option value="Nữ">{t('authPages.completeProfile.gender.female')}</option>
                  <option value="Khác">{t('authPages.completeProfile.gender.other')}</option>
                </select>
              </div>
            </div>

            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateCity">{t('authPages.completeProfile.labels.city')}</label>
                <input id="candidateCity" name="city" className="auth-input" value={candidateForm.city} onChange={handleCandidateChange} />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateDistrict">{t('authPages.completeProfile.labels.district')}</label>
                <input id="candidateDistrict" name="district" className="auth-input" value={candidateForm.district} onChange={handleCandidateChange} />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="candidateAddress">{t('authPages.completeProfile.labels.address')}</label>
              <input id="candidateAddress" name="address" className="auth-input" value={candidateForm.address} onChange={handleCandidateChange} />
            </div>

            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateTitle">{t('authPages.completeProfile.labels.title')}</label>
                <input id="candidateTitle" name="title" className="auth-input" value={candidateForm.title} onChange={handleCandidateChange} />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateExperience">{t('authPages.completeProfile.labels.experienceYears')}</label>
                <input id="candidateExperience" type="number" min="0" name="experienceYears" className="auth-input" value={candidateForm.experienceYears} onChange={handleCandidateChange} />
              </div>
            </div>

            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateEducation">{t('authPages.completeProfile.labels.education')}</label>
                <input id="candidateEducation" name="education" className="auth-input" value={candidateForm.education} onChange={handleCandidateChange} />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="candidateLink">{t('authPages.completeProfile.labels.personalLink')}</label>
                <input id="candidateLink" name="personalLink" className="auth-input" value={candidateForm.personalLink} onChange={handleCandidateChange} />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="candidateAvatar">{t('authPages.completeProfile.labels.avatar')}</label>
              <div className="auth-avatar-upload">
                <div className="auth-avatar-preview-wrap" aria-hidden="true">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar preview" className="auth-avatar-preview" />
                  ) : (
                    <div className="auth-avatar-preview-empty">
                      <i className="bi bi-person-circle"></i>
                    </div>
                  )}
                </div>

                <div className="auth-avatar-upload-actions">
                  <input
                    key={avatarInputKey}
                    id="candidateAvatar"
                    type="file"
                    accept="image/*"
                    className="auth-hidden-file-input"
                    onChange={handleAvatarFileChange}
                  />
                  <label htmlFor="candidateAvatar" className="auth-avatar-upload-btn">{t('authPages.completeProfile.uploadAvatar')}</label>
                  <button type="button" className="auth-avatar-clear-btn" onClick={clearAvatarSelection}>
                    {t('authPages.completeProfile.removeAvatar')}
                  </button>
                  <small className="text-muted d-block">{t('authPages.completeProfile.avatarHint')}</small>
                </div>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="candidateIntro">{t('authPages.completeProfile.labels.selfIntro')}</label>
              <textarea id="candidateIntro" name="introHtml" className="auth-input" style={{ height: 100, paddingTop: 10 }} value={candidateForm.introHtml} onChange={handleCandidateChange} />
            </div>
          </>
        ) : (
          <>
            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerFullName">{t('authPages.completeProfile.labels.representativeName')}</label>
                <input id="employerFullName" name="fullName" className="auth-input" value={employerForm.fullName} onChange={handleEmployerChange} required />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerPhone">{t('authPages.completeProfile.labels.phone')}</label>
                <input id="employerPhone" name="phone" className="auth-input" value={employerForm.phone} onChange={handleEmployerChange} required />
              </div>
            </div>

            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerCompanyName">{t('authPages.completeProfile.labels.companyName')}</label>
                <input id="employerCompanyName" name="companyName" className="auth-input" value={employerForm.companyName} onChange={handleEmployerChange} required />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerTaxCode">{t('authPages.completeProfile.labels.taxCode')}</label>
                <input id="employerTaxCode" name="taxCode" className="auth-input" value={employerForm.taxCode} onChange={handleEmployerChange} />
              </div>
            </div>

            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerCity">{t('authPages.completeProfile.labels.city')}</label>
                <input id="employerCity" name="city" className="auth-input" value={employerForm.city} onChange={handleEmployerChange} />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerIndustry">{t('authPages.completeProfile.labels.industry')}</label>
                <input id="employerIndustry" name="industry" className="auth-input" value={employerForm.industry} onChange={handleEmployerChange} />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="employerAddress">{t('authPages.completeProfile.labels.address')}</label>
              <input id="employerAddress" name="address" className="auth-input" value={employerForm.address} onChange={handleEmployerChange} />
            </div>

            <div className="auth-grid-two">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerWebsite">{t('authPages.completeProfile.labels.website')}</label>
                <input id="employerWebsite" name="website" className="auth-input" value={employerForm.website} onChange={handleEmployerChange} />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="employerLogo">{t('authPages.completeProfile.labels.logoUrl')}</label>
                <input id="employerLogo" name="logo" className="auth-input" value={employerForm.logo} onChange={handleEmployerChange} />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-field-label" htmlFor="employerDescription">{t('authPages.completeProfile.labels.companyDescription')}</label>
              <textarea id="employerDescription" name="description" className="auth-input" style={{ height: 120, paddingTop: 10 }} value={employerForm.description} onChange={handleEmployerChange} />
            </div>
          </>
        )}

        {error ? <div className="auth-error-banner">{error}</div> : null}

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading ? t('authPages.completeProfile.saving') : t('authPages.completeProfile.submit')}
          <i className="bi bi-arrow-right"></i>
        </button>
      </form>
    </AuthLayout>
  );
};

export default CompleteProfilePage;
