import React from 'react';
import { useTranslation } from 'react-i18next';

const AuthHeroPanel = ({
  imageSrc,
  title,
  subtitle,
  eyebrow
}) => {
  const { t } = useTranslation();
  const effectiveEyebrow = eyebrow || t('authPages.layout.heroEyebrow');

  return (
    <div className="auth-hero-panel">
      <img src={imageSrc} alt={t('authPages.layout.heroAlt')} className="auth-hero-image" />
      <div className="auth-hero-layer"></div>
      <div className="auth-hero-copy">
        <p className="auth-hero-eyebrow">{effectiveEyebrow}</p>
        <h2 className="auth-hero-title">{title}</h2>
        {subtitle ? <p className="auth-hero-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
};

export default AuthHeroPanel;
