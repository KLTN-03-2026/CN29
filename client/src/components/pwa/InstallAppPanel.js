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
    dismissInstall,
    clearDismissed,
    dismissedRecently,
  } = usePWAInstallPrompt();

  const [feedback, setFeedback] = useState("");

  const ensureArray = (value, fallback = []) => (Array.isArray(value) ? value : fallback);
  const ensureTipGroup = (value, fallback) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return fallback;
    }

    return {
      badge: String(value.badge || fallback.badge),
      heading: String(value.heading || fallback.heading),
      items: ensureArray(value.items, fallback.items)
    };
  };

  const platformLabels = useMemo(
    () => ({
      [PLATFORM_ANDROID]: t('components.pwa.installAppPanel.platformLabels.android'),
      [PLATFORM_IOS]: t('components.pwa.installAppPanel.platformLabels.ios'),
      [PLATFORM_DESKTOP]: t('components.pwa.installAppPanel.platformLabels.desktop')
    }),
    [t]
  );

  const installSteps = useMemo(
    () => ({
      [PLATFORM_ANDROID]: ensureArray(t('components.pwa.installAppPanel.steps.android', { returnObjects: true }), []),
      [PLATFORM_IOS]: ensureArray(t('components.pwa.installAppPanel.steps.ios', { returnObjects: true }), []),
      [PLATFORM_DESKTOP]: ensureArray(t('components.pwa.installAppPanel.steps.desktop', { returnObjects: true }), [])
    }),
    [t],
  );

  const platformTips = useMemo(
    () => ({
      [PLATFORM_ANDROID]: ensureTipGroup(
        t('components.pwa.installAppPanel.tips.android', { returnObjects: true }),
        { badge: '', heading: '', items: [] }
      ),
      [PLATFORM_IOS]: ensureTipGroup(
        t('components.pwa.installAppPanel.tips.ios', { returnObjects: true }),
        { badge: '', heading: '', items: [] }
      ),
      [PLATFORM_DESKTOP]: ensureTipGroup(
        t('components.pwa.installAppPanel.tips.desktop', { returnObjects: true }),
        { badge: '', heading: '', items: [] }
      )
    }),
    [t],
  );

  const quickChecklist = useMemo(
    () => ensureArray(t('components.pwa.installAppPanel.checklistItems', { returnObjects: true }), []),
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

  const showChecklist = !isInstalled && !isStandalone && (isIOS || canTriggerPrompt);

  return (
    <section className="install-app-panel" aria-label={t('components.pwa.installAppPanel.sectionAriaLabel')}>
      <div className="install-app-panel__intro">
        <h5>{t('components.pwa.installAppPanel.introTitle')}</h5>
        <p>
          {t('components.pwa.installAppPanel.introDescription')}
        </p>
      </div>

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
        <div className="install-app-panel__platform-head">
          <span className="install-app-panel__platform-chip">{platformLabels[activePlatform]}</span>
          <span className="install-app-panel__platform-hint">{platformTips[activePlatform].badge}</span>
        </div>

        <ol className="install-app-panel__steps">
          {installSteps[activePlatform].map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <div className="install-app-panel__tip-box">
          <h6>{platformTips[activePlatform].heading}</h6>
          <ul>
            {platformTips[activePlatform].items.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>

        {showChecklist ? (
          <div className="install-app-panel__checklist">
            <h6>{t('components.pwa.installAppPanel.checklistTitle')}</h6>
            <ul>
              {quickChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="install-app-panel__actions">
          <button
            type="button"
            className="install-app-panel__install-btn"
            onClick={handleInstallClick}
            disabled={isInstalled || isStandalone}
          >
            {installButtonLabel}
          </button>

          <button
            type="button"
            className="install-app-panel__later-btn"
            onClick={() => {
              dismissInstall();
              setFeedback(t('components.pwa.installAppPanel.feedback.hidden7Days'));
            }}
          >
            {t('components.pwa.installAppPanel.laterButton')}
          </button>

          {dismissedRecently && (
            <button
              type="button"
              className="install-app-panel__reset-btn"
              onClick={() => {
                clearDismissed();
                setFeedback(t('components.pwa.installAppPanel.feedback.reenabled'));
              }}
            >
              {t('components.pwa.installAppPanel.reenableButton')}
            </button>
          )}
        </div>

        {feedback && <p className="install-app-panel__feedback">{feedback}</p>}
      </div>
    </section>
  );
};

export default InstallAppPanel;
