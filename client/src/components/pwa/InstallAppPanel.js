import React, { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import usePWAInstallPrompt from "../../hooks/usePWAInstallPrompt";
import "./InstallAppPanel.css";

const PLATFORM_ANDROID = "android";
const PLATFORM_IOS = "ios";
const PLATFORM_DESKTOP = "desktop";

const InstallAppPanel = () => {
  const { t } = useTranslation();
  const {
    isInstalled,
    isStandalone,
    canTriggerPrompt,
    isIOS,
    activePlatform,
    setActivePlatform,
    promptInstall,
  } = usePWAInstallPrompt();

  const [feedback, setFeedback] = useState("");

  const ensureArray = (value, fallback = []) => (Array.isArray(value) ? value : fallback);

  const platformLabels = useMemo(
    () => ({
      [PLATFORM_ANDROID]: t('components.pwa.installAppPanel.platformLabels.android'),
      [PLATFORM_IOS]: t('components.pwa.installAppPanel.platformLabels.ios'),
      [PLATFORM_DESKTOP]: t('components.pwa.installAppPanel.platformLabels.desktop')
    }),
    [t]
  );

  // Show only the first 3 essential steps per platform — full guide trimmed
  // for compactness; user can install correctly with these.
  const installSteps = useMemo(
    () => ({
      [PLATFORM_ANDROID]: ensureArray(t('components.pwa.installAppPanel.steps.android', { returnObjects: true }), []).slice(0, 3),
      [PLATFORM_IOS]: ensureArray(t('components.pwa.installAppPanel.steps.ios', { returnObjects: true }), []).slice(0, 3),
      [PLATFORM_DESKTOP]: ensureArray(t('components.pwa.installAppPanel.steps.desktop', { returnObjects: true }), []).slice(0, 3)
    }),
    [t],
  );

  const handleInstallClick = async () => {
    if (isInstalled || isStandalone) {
      setFeedback(t('components.pwa.installAppPanel.feedback.alreadyInstalled'));
      return;
    }

    if (isIOS) {
      setFeedback(t('components.pwa.installAppPanel.feedback.iosManual'));
      return;
    }

    if (!canTriggerPrompt) {
      setFeedback(t('components.pwa.installAppPanel.feedback.noPrompt'));
      return;
    }

    const outcome = await promptInstall();

    if (outcome === "accepted") {
      setFeedback(t('components.pwa.installAppPanel.feedback.installedSuccess'));
      return;
    }

    if (outcome === "dismissed") {
      setFeedback(t('components.pwa.installAppPanel.feedback.dismissed'));
      return;
    }

    setFeedback(t('components.pwa.installAppPanel.feedback.cannotOpen'));
  };

  const installButtonLabel = isInstalled || isStandalone
    ? t('components.pwa.installAppPanel.installButton.installed')
    : isIOS
      ? t('components.pwa.installAppPanel.installButton.viewIosGuide')
      : canTriggerPrompt
        ? t('components.pwa.installAppPanel.installButton.installNow')
        : t('components.pwa.installAppPanel.installButton.viewManualGuide');

  return (
    <section className="install-app-panel" aria-label={t('components.pwa.installAppPanel.sectionAriaLabel')}>
      <div className="install-app-panel__tabs" role="tablist" aria-label={t('components.pwa.installAppPanel.tabsAriaLabel')}>
        <button
          type="button"
          role="tab"
          className={`install-app-panel__tab ${activePlatform === PLATFORM_ANDROID ? "is-active" : ""}`}
          onClick={() => setActivePlatform(PLATFORM_ANDROID)}
        >
          {platformLabels[PLATFORM_ANDROID]}
        </button>
        <button
          type="button"
          role="tab"
          className={`install-app-panel__tab ${activePlatform === PLATFORM_IOS ? "is-active" : ""}`}
          onClick={() => setActivePlatform(PLATFORM_IOS)}
        >
          {platformLabels[PLATFORM_IOS]}
        </button>
        <button
          type="button"
          role="tab"
          className={`install-app-panel__tab ${activePlatform === PLATFORM_DESKTOP ? "is-active" : ""}`}
          onClick={() => setActivePlatform(PLATFORM_DESKTOP)}
        >
          {platformLabels[PLATFORM_DESKTOP]}
        </button>
      </div>

      <div className="install-app-panel__body" role="tabpanel">
        <ol className="install-app-panel__steps">
          {installSteps[activePlatform].map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <div className="install-app-panel__actions">
          <button
            type="button"
            className="install-app-panel__install-btn"
            onClick={handleInstallClick}
            disabled={isInstalled || isStandalone}
          >
            {installButtonLabel}
          </button>
        </div>

        {feedback && <p className="install-app-panel__feedback">{feedback}</p>}
      </div>
    </section>
  );
};

export default InstallAppPanel;
