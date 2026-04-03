import React from 'react';
import { Link } from 'react-router-dom';
import AuthHeroPanel from './AuthHeroPanel';
import './AuthPages.css';

const AuthLayout = ({
  mode,
  title,
  subtitle,
  switchText,
  switchLabel,
  switchTo,
  heroImage,
  heroTitle,
  heroSubtitle,
  children
}) => {
  return (
    <div className={`auth-page-root auth-page-root--${mode || 'default'}`}>
      <header className="auth-topbar">
        <div className="auth-topbar-inner">
          <Link className="auth-brand" to="/">
            <img src="/images/logo.png" alt="JobFinder" />
            <span className="auth-brand-text">JobFinder</span>
          </Link>
          <p className="auth-switch-text">
            {switchText}
            <Link className="auth-switch-link" to={switchTo}>
              {switchLabel}
            </Link>
          </p>
        </div>
      </header>

      <main className="auth-main">
        <section className="auth-card">
          <AuthHeroPanel
            imageSrc={heroImage}
            title={heroTitle}
            subtitle={heroSubtitle}
          />

          <div className="auth-form-column">
            <h1 className="auth-form-title">{title}</h1>
            {subtitle ? <p className="auth-form-subtitle">{subtitle}</p> : null}
            {children}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AuthLayout;
