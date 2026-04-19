import React from 'react';
import { useTranslation } from 'react-i18next';

const BENEFIT_DEFS = [
  { key: 'matching', icon: 'bi-stars', titleKey: 'home.benefits.matchingTitle', descKey: 'home.benefits.matchingDesc' },
  { key: 'cv', icon: 'bi-file-earmark-richtext', titleKey: 'home.benefits.cvTitle', descKey: 'home.benefits.cvDesc' },
  { key: 'apply', icon: 'bi-lightning-charge', titleKey: 'home.benefits.applyTitle', descKey: 'home.benefits.applyDesc' },
  { key: 'tracking', icon: 'bi-graph-up-arrow', titleKey: 'home.benefits.trackingTitle', descKey: 'home.benefits.trackingDesc' }
];

const TrustBenefitsSection = () => {
  const { t } = useTranslation();

  return (
    <section className="home-benefits-section">
      <div className="home-benefits-header">
        <p className="home-section-eyebrow">{t('home.benefits.eyebrow')}</p>
        <h2>{t('home.benefits.title')}</h2>
      </div>

      <div className="home-benefits-grid">
        {BENEFIT_DEFS.map((benefit) => (
          <article key={benefit.key} className="home-benefit-card">
            <div className="home-benefit-icon">
              <i className={`bi ${benefit.icon}`}></i>
            </div>
            <h3>{t(benefit.titleKey)}</h3>
            <p>{t(benefit.descKey)}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default TrustBenefitsSection;
