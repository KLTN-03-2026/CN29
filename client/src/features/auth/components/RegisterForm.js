import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../../components/NotificationProvider';
import { API_BASE as CLIENT_API_BASE } from '../../../config/apiBase';

const pad2 = (value) => String(value).padStart(2, '0');

const parseIsoDate = (value) => {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;

  const [yearRaw, monthRaw, dayRaw] = text.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  if (month < 1 || month > 12) return null;

  const maxDay = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDay) return null;

  return {
    year,
    month,
    day,
    date: new Date(year, month - 1, day)
  };
};

const RegisterForm = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notify } = useNotification();
  const apiBase = CLIENT_API_BASE;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'Nữ',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false
  });
  const [birthdayParts, setBirthdayParts] = useState({
    day: '',
    month: '',
    year: ''
  });
  const [openBirthdayPart, setOpenBirthdayPart] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const birthdayDropdownRef = useRef(null);
  const currentYear = new Date().getFullYear();

  const yearOptions = useMemo(
    () => Array.from({ length: 85 }, (_, index) => String(currentYear - 16 - index)),
    [currentYear]
  );

  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => ({
      value: String(index + 1),
      label: t('authPages.registerForm.birthday.monthLabel', { month: index + 1 })
    })),
    [t]
  );

  const dayOptions = useMemo(() => {
    const monthNumber = Number(birthdayParts.month || 0);
    const yearNumber = Number(birthdayParts.year || 0);
    const maxDays = monthNumber && yearNumber
      ? new Date(yearNumber, monthNumber, 0).getDate()
      : 31;

    return Array.from({ length: maxDays }, (_, index) => String(index + 1));
  }, [birthdayParts.month, birthdayParts.year]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleBirthdayPartChange = (part, nextValue) => {
    setBirthdayParts((prev) => {
      const next = {
        ...prev,
        [part]: nextValue
      };

      const monthNumber = Number(next.month || 0);
      const yearNumber = Number(next.year || 0);
      const dayNumber = Number(next.day || 0);

      if (monthNumber && yearNumber && dayNumber) {
        const maxDays = new Date(yearNumber, monthNumber, 0).getDate();
        if (dayNumber > maxDays) {
          next.day = '';
        }
      }

      return next;
    });
  };

  const selectedMonthLabel = useMemo(() => {
    const monthNumber = Number(birthdayParts.month || 0);
    if (!monthNumber) return '';
    const found = monthOptions.find((item) => Number(item.value) === monthNumber);
    return found?.label || '';
  }, [birthdayParts.month, monthOptions]);

  const isBirthdayPartOpen = (part) => openBirthdayPart === part;

  const toggleBirthdayPart = (part) => {
    setOpenBirthdayPart((prev) => (prev === part ? '' : part));
  };

  const selectBirthdayPart = (part, value) => {
    handleBirthdayPartChange(part, value);
    setOpenBirthdayPart('');
  };

  useEffect(() => {
    if (!openBirthdayPart) return undefined;

    const handlePointerDown = (event) => {
      if (birthdayDropdownRef.current && !birthdayDropdownRef.current.contains(event.target)) {
        setOpenBirthdayPart('');
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenBirthdayPart('');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openBirthdayPart]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const fullName = `${formData.lastName} ${formData.firstName}`.trim();

    const birthdayIso = (birthdayParts.year && birthdayParts.month && birthdayParts.day)
      ? `${birthdayParts.year}-${pad2(birthdayParts.month)}-${pad2(birthdayParts.day)}`
      : '';
    const birthday = parseIsoDate(birthdayIso);
    if (!birthday) {
      setOpenBirthdayPart('day');
      setLoading(false);
      setError(t('authPages.registerForm.errors.invalidBirthday'));
      return;
    }

    const birthDate = birthday.date;
    const normalizedGender = formData.gender === 'Tùy chỉnh' ? 'Khác' : formData.gender;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 16) {
      setLoading(false);
      setError(t('authPages.registerForm.errors.ageUnder16'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setLoading(false);
      setError(t('authPages.registerForm.errors.invalidEmail'));
      return;
    }

    if (formData.phone && !/^[0-9]{9,12}$/.test(formData.phone.trim())) {
      setLoading(false);
      setError(t('authPages.registerForm.errors.invalidPhone'));
      return;
    }

    if (!formData.acceptedTerms) {
      setLoading(false);
      setError(t('authPages.registerForm.errors.acceptTermsRequired'));
      return;
    }

    if (formData.password.length < 8) {
      setLoading(false);
      setError(t('authPages.registerForm.errors.passwordMinLength'));
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);
    if (!hasLetter || !hasNumber) {
      setLoading(false);
      setError(t('authPages.registerForm.errors.passwordRequireLetterNumber'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLoading(false);
      setError(t('authPages.registerForm.errors.confirmPasswordMismatch'));
      return;
    }

    try {
      const response = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          name: fullName,
          phone: formData.phone.trim(),
          birthday: birthdayIso,
          gender: normalizedGender,
          acceptedTerms: formData.acceptedTerms
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('authPages.registerForm.errors.registerFailed'));
      }

      if (data.requireVerification) {
        if (onSuccess) {
          onSuccess();
        }

        const prefill = {
          fullName,
          phone: formData.phone.trim(),
          birthday: birthdayIso,
          gender: normalizedGender,
          email: formData.email
        };

        localStorage.setItem('pending_onboarding_prefill', JSON.stringify(prefill));

        navigate('/verify-otp', {
          state: {
            email: formData.email,
            otpDeliveryFailed: Boolean(data.otpDeliveryFailed),
            verificationMessage: data.message || '',
            otp: String(data.otp || ''),
            prefill
          }
        });
      } else {
        notify({ type: 'success', message: t('authPages.registerForm.messages.registerSuccess') });
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/login');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const helpText = useMemo(
    () => t('authPages.registerForm.helpText'),
    [t]
  );

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-grid-two">
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="registerLastName">{t('authPages.registerForm.labels.lastName')}</label>
          <input
            id="registerLastName"
            type="text"
            name="lastName"
            className="auth-input"
            placeholder={t('authPages.registerForm.placeholders.lastName')}
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="registerFirstName">{t('authPages.registerForm.labels.firstName')}</label>
          <input
            id="registerFirstName"
            type="text"
            name="firstName"
            className="auth-input"
            placeholder={t('authPages.registerForm.placeholders.firstName')}
            value={formData.firstName}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="auth-field">
        <label className="auth-field-label">{t('authPages.registerForm.labels.birthday')}</label>
        <div className="auth-birthday-select-grid" ref={birthdayDropdownRef}>
          <div className={`auth-birthday-select ${isBirthdayPartOpen('day') ? 'is-open' : ''}`}>
            <button
              type="button"
              className={`auth-input auth-birthday-select-trigger ${isBirthdayPartOpen('day') ? 'is-open' : ''}`}
              onClick={() => toggleBirthdayPart('day')}
              aria-haspopup="listbox"
              aria-expanded={isBirthdayPartOpen('day')}
              aria-label={t('authPages.registerForm.aria.selectBirthdayDay')}
            >
              <span className={birthdayParts.day ? '' : 'is-placeholder'}>
                {birthdayParts.day ? pad2(birthdayParts.day) : t('authPages.registerForm.birthday.dayPlaceholder')}
              </span>
              <i className={`bi ${isBirthdayPartOpen('day') ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true"></i>
            </button>
            {isBirthdayPartOpen('day') && (
              <div className="auth-birthday-select-menu" role="listbox" aria-label={t('authPages.registerForm.aria.selectBirthdayDay')}>
                {dayOptions.map((option) => {
                  const selected = String(birthdayParts.day) === String(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`auth-birthday-select-option ${selected ? 'is-selected' : ''}`}
                      onClick={() => selectBirthdayPart('day', option)}
                      aria-pressed={selected}
                    >
                      {pad2(option)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`auth-birthday-select ${isBirthdayPartOpen('month') ? 'is-open' : ''}`}>
            <button
              type="button"
              className={`auth-input auth-birthday-select-trigger ${isBirthdayPartOpen('month') ? 'is-open' : ''}`}
              onClick={() => toggleBirthdayPart('month')}
              aria-haspopup="listbox"
              aria-expanded={isBirthdayPartOpen('month')}
              aria-label={t('authPages.registerForm.aria.selectBirthdayMonth')}
            >
              <span className={birthdayParts.month ? '' : 'is-placeholder'}>
                {birthdayParts.month ? selectedMonthLabel : t('authPages.registerForm.birthday.monthPlaceholder')}
              </span>
              <i className={`bi ${isBirthdayPartOpen('month') ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true"></i>
            </button>
            {isBirthdayPartOpen('month') && (
              <div className="auth-birthday-select-menu" role="listbox" aria-label={t('authPages.registerForm.aria.selectBirthdayMonth')}>
                {monthOptions.map((option) => {
                  const selected = String(birthdayParts.month) === String(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`auth-birthday-select-option ${selected ? 'is-selected' : ''}`}
                      onClick={() => selectBirthdayPart('month', option.value)}
                      aria-pressed={selected}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`auth-birthday-select ${isBirthdayPartOpen('year') ? 'is-open' : ''}`}>
            <button
              type="button"
              className={`auth-input auth-birthday-select-trigger ${isBirthdayPartOpen('year') ? 'is-open' : ''}`}
              onClick={() => toggleBirthdayPart('year')}
              aria-haspopup="listbox"
              aria-expanded={isBirthdayPartOpen('year')}
              aria-label={t('authPages.registerForm.aria.selectBirthdayYear')}
            >
              <span className={birthdayParts.year ? '' : 'is-placeholder'}>
                {birthdayParts.year || t('authPages.registerForm.birthday.yearPlaceholder')}
              </span>
              <i className={`bi ${isBirthdayPartOpen('year') ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true"></i>
            </button>
            {isBirthdayPartOpen('year') && (
              <div className="auth-birthday-select-menu" role="listbox" aria-label={t('authPages.registerForm.aria.selectBirthdayYear')}>
                {yearOptions.map((option) => {
                  const selected = String(birthdayParts.year) === String(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`auth-birthday-select-option ${selected ? 'is-selected' : ''}`}
                      onClick={() => selectBirthdayPart('year', option)}
                      aria-pressed={selected}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="auth-birthday-hint">{t('authPages.registerForm.birthday.ageHint')}</div>
      </div>

      <div className="auth-field">
        <label className="auth-field-label">{t('authPages.registerForm.labels.gender')}</label>
        <div className="auth-radio-group">
          {[
            { value: 'Nữ', label: t('authPages.registerForm.gender.female') },
            { value: 'Nam', label: t('authPages.registerForm.gender.male') },
            { value: 'Tùy chỉnh', label: t('authPages.registerForm.gender.custom') }
          ].map((item) => (
            <label key={item.value} className="auth-radio-chip">
              <input
                type="radio"
                name="gender"
                value={item.value}
                checked={formData.gender === item.value}
                onChange={handleChange}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="auth-grid-two">
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="registerEmail">{t('authPages.registerForm.labels.email')}</label>
          <input
            id="registerEmail"
            type="email"
            name="email"
            className="auth-input"
            placeholder={t('authPages.registerForm.placeholders.email')}
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="registerPhone">{t('authPages.registerForm.labels.phone')}</label>
          <input
            id="registerPhone"
            type="tel"
            name="phone"
            className="auth-input"
            placeholder={t('authPages.registerForm.placeholders.phone')}
            value={formData.phone}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="auth-grid-two">
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="registerPassword">{t('authPages.registerForm.labels.password')}</label>
          <div className="auth-input-wrap">
            <input
              id="registerPassword"
              type={showPassword ? 'text' : 'password'}
              name="password"
              className="auth-input auth-input--with-icon"
              placeholder={t('authPages.registerForm.placeholders.password')}
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="auth-password-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword
                ? t('authPages.registerForm.aria.hidePassword')
                : t('authPages.registerForm.aria.showPassword')}
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
            </button>
          </div>
        </div>
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="registerConfirmPassword">{t('authPages.registerForm.labels.confirmPassword')}</label>
          <div className="auth-input-wrap">
            <input
              id="registerConfirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              className="auth-input auth-input--with-icon"
              placeholder={t('authPages.registerForm.placeholders.confirmPassword')}
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="auth-password-btn"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword
                ? t('authPages.registerForm.aria.hidePassword')
                : t('authPages.registerForm.aria.showPassword')}
            >
              <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
            </button>
          </div>
        </div>
      </div>

      <p className="auth-help-note">{helpText}</p>

      <label className="auth-checkbox-wrap auth-checkbox-wrap--terms" style={{ marginBottom: 14 }} htmlFor="acceptedTerms">
        <input
          id="acceptedTerms"
          type="checkbox"
          name="acceptedTerms"
          checked={formData.acceptedTerms}
          onChange={handleChange}
        />
        <span>{t('authPages.registerForm.acceptTerms')}</span>
      </label>

      <p className="auth-terms-text">
        {t('authPages.registerForm.terms.prefix')} <a href="/#">{t('authPages.registerForm.terms.terms')}</a>,
        {' '}<a href="/#">{t('authPages.registerForm.terms.privacy')}</a> {t('authPages.registerForm.terms.and')} <a href="/#">{t('authPages.registerForm.terms.cookies')}</a>.
      </p>

      {error ? <div className="auth-error-banner">{error}</div> : null}

      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? t('authPages.registerForm.processing') : t('authPages.registerForm.submit')}
        <i className="bi bi-arrow-right"></i>
      </button>

      <p className="auth-switch-inline">
        {t('authPages.registerForm.hasAccount')} <Link to="/login">{t('authPages.registerForm.login')}</Link>
      </p>
    </form>
  );
};

export default RegisterForm;
