/* ==========================================================================
   pwa.js - Progressive Web App (PWA) Standalone Controller
   Handles service worker registration, install prompts, standalone detection,
   network status synchronization, and offline/online notifications.
   ========================================================================== */
(function () {
  'use strict';

  var deferredPrompt = null;
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                     window.matchMedia('(display-mode: window-controls-overlay)').matches ||
                     window.navigator.standalone === true;

  // Global PWA interface
  window.MLS_PWA = {
    isStandalone: isStandalone,
    canInstall: false,
    promptInstall: promptInstall,
    showInstallModal: showInstallModal
  };

  /* ---- Service Worker Registration & Updates ---- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js?v=20261011-3')
        .then(function (reg) {
          reg.addEventListener('updatefound', function () {
            var newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', function () {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                if (window.MLS && window.MLS.UI && window.MLS.UI.toast) {
                  window.MLS.UI.toast('New portal version ready. Refreshing...', 'ok');
                }
              }
            });
          });
        })
        .catch(function (e) {
          console.warn('Service worker registration issue:', e);
        });
    });
  }

  /* ---- Install Prompt Handling ---- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    window.MLS_PWA.canInstall = true;
    updateInstallButtons(true);
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    window.MLS_PWA.canInstall = false;
    window.MLS_PWA.isStandalone = true;
    updateInstallButtons(false);
    if (window.MLS && window.MLS.UI && window.MLS.UI.toast) {
      window.MLS.UI.toast('Medical Laboratory Portal successfully installed to your device!', 'ok');
    }
  });

  function promptInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        if (choice.outcome === 'accepted') {
          deferredPrompt = null;
          updateInstallButtons(false);
        }
      });
    } else {
      showInstallModal();
    }
  }

  function updateInstallButtons(available) {
    var btns = document.querySelectorAll('[data-pwa-install]');
    btns.forEach(function (btn) {
      btn.style.display = (available && !isStandalone) ? '' : 'none';
    });
  }

  function showInstallModal() {
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    var content =
      '<div class="pwa-modal-banner">' +
      '<img src="assets/images/institution-logo-placeholder.svg" alt="MLS Crest">' +
      '<div>' +
      '<strong style="font-size:1.05rem;display:block">Install MLS Portal App</strong>' +
      '<span style="font-size:0.8rem;color:#93c5fd">Access offline, launch instantly, and get full standalone experience.</span>' +
      '</div></div>' +
      (isIOS ?
        '<div style="margin-bottom:14px;color:var(--text);font-size:0.9rem"><p>To install on your iOS device:</p>' +
        '<div class="pwa-step-box"><span class="pwa-step-num">1</span><div>Tap the <strong>Share</strong> button in Safari toolbar below.</div></div>' +
        '<div class="pwa-step-box"><span class="pwa-step-num">2</span><div>Scroll down and select <strong>Add to Home Screen</strong>.</div></div>' +
        '<div class="pwa-step-box"><span class="pwa-step-num">3</span><div>Tap <strong>Add</strong> at top right to finalize installation.</div></div>' +
        '</div>'
        :
        '<div style="margin-bottom:14px;color:var(--text);font-size:0.9rem">' +
        '<p>Install this web application as a standalone desktop or mobile app without an app store:</p>' +
        '<div class="pwa-step-box"><span class="pwa-step-num">1</span><div>In Chrome or Edge, click the <strong>Install</strong> icon in the address bar (or browser menu &#8942;).</div></div>' +
        '<div class="pwa-step-box"><span class="pwa-step-num">2</span><div>Select <strong>Install MLS Portal</strong>.</div></div>' +
        '<div class="pwa-step-box"><span class="pwa-step-num">3</span><div>Launch directly from your desktop, taskbar, or home screen!</div></div>' +
        '</div>'
      );

    if (window.MLS && window.MLS.UI && window.MLS.UI.dialog) {
      window.MLS.UI.dialog('Install Standalone App', content, '<button type="button" class="btn" data-action="closeDlg">Got it</button>');
    }
  }

  /* ---- Network Status (Online / Offline) Monitoring ---- */
  function updateNetworkStatus() {
    var online = navigator.onLine;
    var pill = document.getElementById('network-status-pill');
    if (pill) {
      pill.className = 'status-pill ' + (online ? 'online' : 'offline');
      pill.innerHTML = '<span class="dot"></span>' + (online ? 'Online' : 'Offline Mode');
      pill.title = online ? 'Connected to network' : 'Using cached offline records';
    }

    if (window.MLS && window.MLS.UI && window.MLS.UI.toast) {
      if (!online) {
        window.MLS.UI.toast('You are currently offline. Cached academic records are available.', 'warn');
      } else {
        window.MLS.UI.toast('Internet connection restored.', 'ok');
      }
    }
  }

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
})();

