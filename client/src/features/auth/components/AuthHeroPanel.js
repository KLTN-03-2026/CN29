import React from 'react';

const AuthHeroPanel = ({
  imageSrc,
  title,
  subtitle,
  eyebrow = 'NEN TANG NGHE NGHIEP'
}) => {
  return (
    <div className="auth-hero-panel">
      <img src={imageSrc} alt="Auth hero" className="auth-hero-image" />
      <div className="auth-hero-layer"></div>
      <div className="auth-hero-copy">
        <p className="auth-hero-eyebrow">{eyebrow}</p>
        <h2 className="auth-hero-title">{title}</h2>
        {subtitle ? <p className="auth-hero-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
};

export default AuthHeroPanel;
