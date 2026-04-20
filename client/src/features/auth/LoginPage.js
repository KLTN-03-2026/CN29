import React from 'react';
import { useTranslation } from 'react-i18next';
import AuthLayout from './components/AuthLayout';
import LoginForm from './components/LoginForm';

const LoginPage = () => {
  const { t } = useTranslation();

  return (
    <AuthLayout
      mode="login"
      title={t('authPages.loginPage.title')}
      subtitle={t('authPages.loginPage.subtitle')}
      switchText={t('authPages.loginPage.switchText')}
      switchLabel={t('authPages.loginPage.switchLabel')}
      switchTo="/register"
      heroImage="/images/auth-career-hero.svg"
      heroTitle={t('authPages.loginPage.heroTitle')}
      heroSubtitle={t('authPages.loginPage.heroSubtitle')}
    >
      <LoginForm />
    </AuthLayout>
  );
};

export default LoginPage;
