import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CVBuilderCTA = () => {
  const { t } = useTranslation();

  return (
    <section className="home-cv-cta">
      <div className="home-cv-cta-content">
        <div>
          <p className="home-section-eyebrow">{t('home.cta.eyebrow')}</p>
          <h2>{t('home.cta.title')}</h2>
          <p>
            {t('home.cta.subtitle')}
          </p>
        </div>

        <div className="home-cv-cta-actions">
          <Link to="/create-cv" className="home-cv-cta-primary">{t('home.cta.createNow')}</Link>
          <Link to="/create-cv/templates" className="home-cv-cta-secondary">{t('home.cta.chooseTemplate')}</Link>
        </div>
      </div>
    </section>
  );
};

export default CVBuilderCTA;
