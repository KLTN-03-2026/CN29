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

const RoleSelectionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const apiBase = CLIENT_API_BASE;

  const token = String(localStorage.getItem('token') || '').trim();
  const currentUser = readJsonStorage('user', {});
  const prefill = useMemo(
    () => location.state?.prefill || readJsonStorage('pending_onboarding_prefill', {}),
    [location.state]
  );

  const [selectedRole, setSelectedRole] = useState(() => {
    if (currentUser?.role === EMPLOYER_ROLE) return EMPLOYER_ROLE;
    if (currentUser?.role === CANDIDATE_ROLE) return CANDIDATE_ROLE;
    return '';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [navigate, token]);

  if (!token) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!selectedRole) {
      setError('Vui lòng chọn vai trò để tiếp tục.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/select-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: selectedRole })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Không thể lưu vai trò.');
      }

      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      const roleKey = selectedRole === EMPLOYER_ROLE ? 'employer' : 'candidate';
      const nextStep = String(data.nextStep || `/onboarding/profile?role=${roleKey}`).trim();
      navigate(nextStep, {
        state: { prefill },
        replace: true
      });
    } catch (err) {
      setError(err.message || 'Không thể lưu vai trò.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      mode="register"
      title="Chọn vai trò của bạn"
      subtitle="Bước này giúp hệ thống hiển thị đúng biểu mẫu hoàn thiện hồ sơ cho bạn."
      switchText="Muốn đăng nhập tài khoản khác?"
      switchLabel="Đăng nhập"
      switchTo="/login"
      heroImage="/images/auth-growth-hero.svg"
      heroTitle="Một tài khoản chung, nhiều trải nghiệm phù hợp vai trò."
      heroSubtitle="Chọn vai trò trước khi hoàn thiện hồ sơ để vào đúng khu vực hệ thống."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field" style={{ marginBottom: 16 }}>
          <label className="auth-field-label">Bạn muốn sử dụng JobFinder với vai trò nào?</label>
          <div className="auth-radio-group" style={{ gridTemplateColumns: '1fr' }}>
            <label className="auth-radio-chip">
              <input
                type="radio"
                name="role"
                value={CANDIDATE_ROLE}
                checked={selectedRole === CANDIDATE_ROLE}
                onChange={(event) => setSelectedRole(event.target.value)}
              />
              <span>Ứng viên</span>
            </label>
            <label className="auth-radio-chip">
              <input
                type="radio"
                name="role"
                value={EMPLOYER_ROLE}
                checked={selectedRole === EMPLOYER_ROLE}
                onChange={(event) => setSelectedRole(event.target.value)}
              />
              <span>Nhà tuyển dụng</span>
            </label>
          </div>
        </div>

        {error ? <div className="auth-error-banner">{error}</div> : null}

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Tiếp tục'}
          <i className="bi bi-arrow-right"></i>
        </button>
      </form>
    </AuthLayout>
  );
};

export default RoleSelectionPage;
