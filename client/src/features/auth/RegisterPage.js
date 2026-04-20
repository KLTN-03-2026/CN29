import React from 'react';
import { useTranslation } from 'react-i18next';
import AuthLayout from './components/AuthLayout';
import RegisterForm from './components/RegisterForm';

const RegisterPage = () => {
  const { t } = useTranslation();

  return (
    <AuthLayout
      mode="register"
      title={t('authPages.registerPage.title')}
      subtitle={t('authPages.registerPage.subtitle')}
      switchText={t('authPages.registerPage.switchText')}
      switchLabel={t('authPages.registerPage.switchLabel')}
      switchTo="/login"
      heroImage="/images/auth-growth-hero.svg"
      heroTitle={t('authPages.registerPage.heroTitle')}
      heroSubtitle={t('authPages.registerPage.heroSubtitle')}
    >
      <RegisterForm />
    </AuthLayout>
  );
};

export default RegisterPage;
