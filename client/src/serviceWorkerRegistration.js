const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    window.location.hostname === "[::1]" ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/,
    ),
);

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state !== "installed") {
            return;
          }

          if (navigator.serviceWorker.controller) {
            if (config && config.onUpdate) {
              config.onUpdate(registration);
            }
          } else if (config && config.onSuccess) {
            config.onSuccess(registration);
          }
        };
      };
    })
    .catch((error) => {
      console.error("Service worker registration failed:", error);
    });
}

export function register(config) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (!("serviceWorker" in navigator)) {
    return;
  }

  // Avoid stale UI during localhost QA by disabling service worker caching locally.
  if (isLocalhost) {
    unregister();
    return;
  }

  const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
  if (publicUrl.origin !== window.location.origin) {
    return;
  }

  window.addEventListener("load", () => {
    const swUrl = `${process.env.PUBLIC_URL}/sw.js`;
    registerValidSW(swUrl, config);
  });
}

export function unregister() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.ready
    .then((registration) => registration.unregister())
    .catch((error) => {
      console.error(error.message);
    });
}
