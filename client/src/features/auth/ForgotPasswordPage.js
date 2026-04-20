import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthLayout from './components/AuthLayout';
import ForgotPassword from './ForgotPassword';

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <AuthLayout
      mode="forgot"
      title={t('authPages.forgotPasswordPage.title')}
      subtitle={t('authPages.forgotPasswordPage.subtitle')}
      switchText={t('authPages.forgotPasswordPage.switchText')}
      switchLabel={t('authPages.forgotPasswordPage.switchLabel')}
      switchTo="/login"
      heroImage="/images/auth-career-hero.svg"
      heroTitle={t('authPages.forgotPasswordPage.heroTitle')}
      heroSubtitle={t('authPages.forgotPasswordPage.heroSubtitle')}
    >
      <div className="auth-forgot-panel">
        <ForgotPassword inline={true} onClose={() => navigate('/login')} />
      </div>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
