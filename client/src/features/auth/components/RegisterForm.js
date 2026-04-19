import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const currentYear = new Date().getFullYear();

  const yearOptions = useMemo(
    () => Array.from({ length: 90 }, (_, index) => String(currentYear - index)),
    [currentYear]
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

  const handleBirthdayPartChange = (part) => (event) => {
    const nextValue = event.target.value;

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
      setLoading(false);
      setError('Vui lòng chọn đầy đủ ngày, tháng, năm hợp lệ');
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
      setError('Bạn phải đủ 16 tuổi để đăng ký tài khoản');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setLoading(false);
      setError('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }

    if (formData.phone && !/^[0-9]{9,12}$/.test(formData.phone.trim())) {
      setLoading(false);
      setError('Số điện thoại phải gồm 9 đến 12 chữ số');
      return;
    }

    if (!formData.acceptedTerms) {
      setLoading(false);
      setError('Bạn cần đồng ý điều khoản sử dụng dịch vụ');
      return;
    }

    if (formData.password.length < 8) {
      setLoading(false);
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);
    if (!hasLetter || !hasNumber) {
      setLoading(false);
      setError('Mật khẩu phải bao gồm cả chữ và số');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLoading(false);
      setError('Mật khẩu xác nhận không khớp');
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
        throw new Error(data.error || 'Đăng ký thất bại');
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
        notify({ type: 'success', message: 'Đăng ký thành công! Vui lòng đăng nhập.' });
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
    () => 'Hồ sơ được tối ưu sẽ giúp bạn tiếp cận cơ hội phù hợp nhanh hơn trên JobFinder.',
    []
  );

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-grid-two">
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="registerLastName">Họ</label>
          <input
            id="registerLastName"
            type="text"
            name="lastName"
            className="auth-input"
            placeholder="Nguyễn"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="registerFirstName">Tên</label>
          <input
            id="registerFirstName"
            type="text"
            name="firstName"
            className="auth-input"
            placeholder="Văn A"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="auth-field">
        <label className="auth-field-label">Ngày sinh</label>
        <div className="auth-birthday-select-grid">
          <select
            id="registerBirthDay"
            className="auth-select"
            value={birthdayParts.day}
            onChange={handleBirthdayPartChange('day')}
            required
          >
            <option value="">Ngày</option>
            {dayOptions.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>

          <select
            id="registerBirthMonth"
            className="auth-select"
            value={birthdayParts.month}
            onChange={handleBirthdayPartChange('month')}
            required
          >
            <option value="">Tháng</option>
            {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>

          <select
            id="registerBirthYear"
            className="auth-select"
            value={birthdayParts.year}
            onChange={handleBirthdayPartChange('year')}
            required
          >
            <option value="">Năm</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="auth-field">
        <label className="auth-field-label">Giới tính</label>
        <div className="auth-radio-group">
          {['Nữ', 'Nam', 'Tùy chỉnh'].map((label) => (
            <label key={label} className="auth-radio-chip">
              <input
                type="radio"
                name="gender"
                value={label}
                checked={formData.gender === label}
                onChange={handleChange}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="auth-grid-two">
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="registerEmail">Email</label>
          <input
            id="registerEmail"
            type="email"
            name="email"
            className="auth-input"
            placeholder="name@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="registerPhone">Số điện thoại</label>
          <input
            id="registerPhone"
            type="tel"
            name="phone"
            className="auth-input"
            placeholder="09xxxxxxxx"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="auth-grid-two">
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="registerPassword">Mật khẩu</label>
          <div className="auth-input-wrap">
            <input
              id="registerPassword"
              type={showPassword ? 'text' : 'password'}
              name="password"
              className="auth-input auth-input--with-icon"
              placeholder="Tối thiểu 8 ký tự"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="auth-password-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
            </button>
          </div>
        </div>
        <div className="auth-field">
          <label className="auth-field-label" htmlFor="registerConfirmPassword">Xác nhận mật khẩu</label>
          <div className="auth-input-wrap">
            <input
              id="registerConfirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              className="auth-input auth-input--with-icon"
              placeholder="Nhập lại mật khẩu"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="auth-password-btn"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
        <span>Tôi đồng ý với điều khoản sử dụng dịch vụ</span>
      </label>

      <p className="auth-terms-text">
        Bằng cách nhấn Đăng ký, bạn đồng ý với <a href="/#">Điều khoản</a>,
        {' '}<a href="/#">Chính sách quyền riêng tư</a> và <a href="/#">Chính sách cookie</a>.
      </p>

      {error ? <div className="auth-error-banner">{error}</div> : null}

      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? 'Đang xử lý...' : 'Tạo tài khoản ngay'}
        <i className="bi bi-arrow-right"></i>
      </button>

      <p className="auth-switch-inline">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </form>
  );
};

export default RegisterForm;
