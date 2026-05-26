var GITHUB_TRANSLATIONS = window.GITHUB_TRANSLATIONS || {};

(function () {
  'use strict';

  var observer = null;
  var burstTimers = [];
  var cooldownTimer = null;
  var translating = false;

  function doTranslate() {
    if (translating) return;
    translating = true;
    try {
      if (GITHUB_TRANSLATIONS.translator && GITHUB_TRANSLATIONS.translator.isEnabled()) {
        GITHUB_TRANSLATIONS.translator.translatePage(document.body);
      }
    } finally {
      setTimeout(function () {
        translating = false;
      }, 50);
    }
  }

  function clearBurst() {
    for (var i = 0; i < burstTimers.length; i++) {
      clearTimeout(burstTimers[i]);
    }
    burstTimers = [];
    if (cooldownTimer) {
      clearTimeout(cooldownTimer);
      cooldownTimer = null;
    }
  }

  function launchBurst() {
    clearBurst();

    var delays = [0, 100, 300, 700, 1500, 3000];
    for (var i = 0; i < delays.length; i++) {
      (function (d) {
        burstTimers.push(setTimeout(function () {
          doTranslate();
        }, d));
      })(delays[i]);
    }

    cooldownTimer = setTimeout(function () {
      burstTimers = [];
      cooldownTimer = null;
    }, 3000 + 500);
  }

  function startObserving() {
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver(function (mutations) {
      if (translating) return;

      var hasNewContent = false;

      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];

        if (m.type === 'childList' && m.addedNodes.length > 0) {
          for (var j = 0; j < m.addedNodes.length; j++) {
            if (m.addedNodes[j].nodeType === Node.ELEMENT_NODE) {
              hasNewContent = true;
              break;
            }
          }
        }

        if (m.type === 'characterData') {
          var t = m.target;
          if (t && t.parentElement && !t.parentElement.closest('pre, code, [contenteditable="true"]')) {
            hasNewContent = true;
          }
        }

        if (m.type === 'attributes') {
          var a = m.attributeName;
          if (a === 'placeholder' || a === 'aria-label' || a === 'title' ||
              a === 'data-content' || a === 'aria-description' || a === 'open') {
            hasNewContent = true;
          }
        }

        if (hasNewContent) break;
      }

      if (hasNewContent) {
        launchBurst();
      }
    });

    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'placeholder', 'aria-label', 'title', 'data-content',
        'aria-description', 'open', 'hidden'
      ]
    });
  }

  function stopObserving() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    clearBurst();
  }

  function initTurboListener() {
    function onNav() {
      launchBurst();
    }

    document.addEventListener('turbo:load', onNav);
    document.addEventListener('turbo:frame-load', onNav);
    document.addEventListener('turbo:render', onNav);
    document.addEventListener('soft-nav:end', onNav);
    window.addEventListener('popstate', onNav);
  }

  GITHUB_TRANSLATIONS.observer = {
    start: startObserving,
    stop: stopObserving,
    initTurboListener: initTurboListener,
    launchBurst: launchBurst
  };
})();
