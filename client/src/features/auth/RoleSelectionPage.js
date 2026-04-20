import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      setError(t('authPages.roleSelection.errors.selectRoleRequired'));
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
        throw new Error(data.error || t('authPages.roleSelection.errors.saveRoleFailed'));
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
      setError(err.message || t('authPages.roleSelection.errors.saveRoleFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      mode="register"
      title={t('authPages.roleSelection.title')}
      subtitle={t('authPages.roleSelection.subtitle')}
      switchText={t('authPages.roleSelection.switchText')}
      switchLabel={t('authPages.roleSelection.switchLabel')}
      switchTo="/login"
      heroImage="/images/auth-growth-hero.svg"
      heroTitle={t('authPages.roleSelection.heroTitle')}
      heroSubtitle={t('authPages.roleSelection.heroSubtitle')}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field" style={{ marginBottom: 16 }}>
          <label className="auth-field-label">{t('authPages.roleSelection.rolePrompt')}</label>
          <div className="auth-radio-group" style={{ gridTemplateColumns: '1fr' }}>
            <label className="auth-radio-chip">
              <input
                type="radio"
                name="role"
                value={CANDIDATE_ROLE}
                checked={selectedRole === CANDIDATE_ROLE}
                onChange={(event) => setSelectedRole(event.target.value)}
              />
              <span>{t('authPages.roleSelection.candidate')}</span>
            </label>
            <label className="auth-radio-chip">
              <input
                type="radio"
                name="role"
                value={EMPLOYER_ROLE}
                checked={selectedRole === EMPLOYER_ROLE}
                onChange={(event) => setSelectedRole(event.target.value)}
              />
              <span>{t('authPages.roleSelection.employer')}</span>
            </label>
          </div>
        </div>

        {error ? <div className="auth-error-banner">{error}</div> : null}

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading ? t('authPages.roleSelection.processing') : t('authPages.roleSelection.continue')}
          <i className="bi bi-arrow-right"></i>
        </button>
      </form>
    </AuthLayout>
  );
};

export default RoleSelectionPage;
