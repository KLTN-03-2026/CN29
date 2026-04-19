import React from 'react';
import { useTranslation } from 'react-i18next';

const STEP_DEFS = [
  { id: 'profile', icon: 'bi-person-vcard', titleKey: 'home.how.stepProfileTitle', descKey: 'home.how.stepProfileDesc' },
  { id: 'search', icon: 'bi-search', titleKey: 'home.how.stepSearchTitle', descKey: 'home.how.stepSearchDesc' },
  { id: 'apply', icon: 'bi-send-check', titleKey: 'home.how.stepApplyTitle', descKey: 'home.how.stepApplyDesc' }
];

const HowItWorksSection = () => {
  const { t } = useTranslation();

  return (
    <section className="home-how-section">
      <div className="home-how-header">
        <p className="home-section-eyebrow">{t('home.how.eyebrow')}</p>
        <h2>{t('home.how.title')}</h2>
      </div>

      <div className="home-how-grid">
        {STEP_DEFS.map((step, index) => (
          <article key={step.id} className="home-how-card">
            <span className="home-how-step">{t('home.how.stepLabel', { index: index + 1 })}</span>
            <div className="home-how-icon">
              <i className={`bi ${step.icon}`}></i>
            </div>
            <h3>{t(step.titleKey)}</h3>
            <p>{t(step.descKey)}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default HowItWorksSection;
