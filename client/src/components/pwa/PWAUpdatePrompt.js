import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import "./PWAUpdatePrompt.css";

const PWAUpdatePrompt = () => {
  const { t } = useTranslation();
  const [registration, setRegistration] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const updateHandler = (event) => {
      setRegistration(event.detail?.registration || null);
      setHidden(false);
    };

    window.addEventListener("pwa:update-available", updateHandler);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          setRegistration(reg);
          setHidden(false);
        }
      });
    }

    return () => {
      window.removeEventListener("pwa:update-available", updateHandler);
    };
  }, []);

  const handleRefresh = () => {
    if (!registration?.waiting) {
      window.location.reload();
      return;
    }

    const onControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange, {
      once: true,
    });

    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  };

  if (!registration || hidden) {
    return null;
  }

  return (
    <div className="pwa-update-prompt" role="status" aria-live="polite">
      <div className="pwa-update-prompt__content">
        <strong>{t('components.pwa.updatePrompt.readyTitle')}</strong>
        <span>{t('components.pwa.updatePrompt.readyDescription')}</span>
      </div>
      <div className="pwa-update-prompt__actions">
        <button type="button" onClick={handleRefresh}>
          {t('components.pwa.updatePrompt.updateNow')}
        </button>
        <button type="button" className="is-secondary" onClick={() => setHidden(true)}>
          {t('components.pwa.updatePrompt.later')}
        </button>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;
