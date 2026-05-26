var GITHUB_TRANSLATIONS = window.GITHUB_TRANSLATIONS || {};

(function () {
  'use strict';

  var TRANSLATION_MAP = {};
  var ENABLED = true;
  var TRANSLATED_ATTR = 'data-gh-cn';
  var aiQueue = [];

  function init() {
    var sources = ['common', 'ui', 'modules', 'docs'];
    sources.forEach(function (source) {
      if (GITHUB_TRANSLATIONS[source]) {
        Object.keys(GITHUB_TRANSLATIONS[source]).forEach(function (key) {
          TRANSLATION_MAP[key] = GITHUB_TRANSLATIONS[source][key];
        });
      }
    });
  }

  function getTranslation(text) {
    var trimmed = text.trim();
    if (TRANSLATION_MAP[trimmed]) {
      return TRANSLATION_MAP[trimmed];
    }
    return null;
  }

  function translateText(text) {
    if (!text || !ENABLED) return text;

    var translation = getTranslation(text);
    if (translation) {
      return translation;
    }

    var aiTranslator = GITHUB_TRANSLATIONS.aiTranslator;
    if (aiTranslator && aiTranslator.isAiEnabled()) {
      var aiCached = aiTranslator.getCachedTranslation(text);
      if (aiCached) return aiCached;

      var trimmed = text.trim();
      if (trimmed.length >= 3 && /[a-zA-Z]{2,}/.test(trimmed)) {
        var isKnownCode = /^\s*(function|class|const|let|var|import|export|return|if|else|for|while|try|catch|throw|new|this|async|await|yield|typeof|instanceof)\b/.test(trimmed);
        if (!isKnownCode) {
          collectForAi(text, null);
        }
      }
    }

    var result = text;
    var patterns = [
      { regex: /^(\d+)\s*,\s*(\d+)\s+results?\s*$/i, replace: function (m, a, b) { return a + ',' + b + ' 个结果'; } },
      { regex: /^(\d+)\s+results?\s*$/i, replace: function (m, n) { return n + ' 个结果'; } },
      { regex: /^(\d+)\s+commits?\s*$/i, replace: function (m, n) { return n + ' 个提交'; } },
      { regex: /^(\d+)\s+files?\s+changed\s*$/i, replace: function (m, n) { return n + ' 个文件变更'; } },
      { regex: /^(\d+)\s+changed\s+files?\s*$/i, replace: function (m, n) { return n + ' 个变更文件'; } },
      { regex: /^(\d+)\s+additions?\s*$/i, replace: function (m, n) { return n + ' 行添加'; } },
      { regex: /^(\d+)\s+deletions?\s*$/i, replace: function (m, n) { return n + ' 行删除'; } },
      { regex: /^Showing\s+(\d+)\s+changed\s+files?\s+with\s+(\d+)\s+additions?\s+and\s+(\d+)\s+deletions?/i,
        replace: function (m, f, a, d) { return '显示 ' + f + ' 个变更文件，包含 ' + a + ' 行添加和 ' + d + ' 行删除'; } },
      { regex: /^(\d+)\s+changed\s+files?\s+with\s+(\d+)\s+additions?\s+and\s+(\d+)\s+deletions?/i,
        replace: function (m, f, a, d) { return f + ' 个变更文件，' + a + ' 行添加，' + d + ' 行删除'; } },
      { regex: /^(\d+)\s+contributors?\s*$/i, replace: function (m, n) { return n + ' 位贡献者'; } },
      { regex: /^(\d+)\s+forks?\s*$/i, replace: function (m, n) { return n + ' 个复刻'; } },
      { regex: /^(\d+)\s+stars?\s*$/i, replace: function (m, n) { return n + ' 个收藏'; } },
      { regex: /^(\d+)\s+issues?\s*$/i, replace: function (m, n) { return n + ' 个议题'; } },
      { regex: /^(\d+)\s+pull\s+requests?\s*$/i, replace: function (m, n) { return n + ' 个拉取请求'; } },
      { regex: /^(\d+)\s+branches?\s*$/i, replace: function (m, n) { return n + ' 个分支'; } },
      { regex: /^(\d+)\s+tags?\s*$/i, replace: function (m, n) { return n + ' 个标签'; } },
      { regex: /^(\d+)\s+releases?\s*$/i, replace: function (m, n) { return n + ' 个发布'; } },
      { regex: /^(\d+)\s+packages?\s*$/i, replace: function (m, n) { return n + ' 个包'; } },
      { regex: /^(\d+)\s+projects?\s*$/i, replace: function (m, n) { return n + ' 个项目'; } },
      { regex: /^(\d+)\s+discussions?\s*$/i, replace: function (m, n) { return n + ' 个讨论'; } },
      { regex: /^(\d+)\s+reactions?\s*$/i, replace: function (m, n) { return n + ' 个表态'; } },
      { regex: /^\+\s*(\d+)\s*,\s*-\s*(\d+)\s*$/, replace: function (m, a, d) { return '+' + a + ', -' + d; } },
      { regex: /^\+\s*(\d+)\s*\/\s*-\s*(\d+)\s*$/, replace: function (m, a, d) { return '+' + a + ' / -' + d; } },
      { regex: /^(\d+)\s+new\s+items?\s*$/i, replace: function (m, n) { return n + ' 个新条目'; } },
      { regex: /^(\d+)\s+notifications?\s*$/i, replace: function (m, n) { return n + ' 条通知'; } },
      { regex: /^Unread\s*\(\s*(\d+)\s*\)\s*$/i, replace: function (m, n) { return '未读 (' + n + ')'; } },
      { regex: /^page\s+(\d+)\s*$/i, replace: function (m, n) { return '第 ' + n + ' 页'; } },
      { regex: /^(\d+)\s+of\s+(\d+)\s*$/i, replace: function (m, a, b) { return a + ' / ' + b; } }
    ];

    for (var i = 0; i < patterns.length; i++) {
      var p = patterns[i];
      var match = result.match(p.regex);
      if (match) {
        result = p.replace.apply(null, match);
        break;
      }
    }

    return result;
  }

  function isCodeContext(el) {
    if (!el) return false;

    var tag = (el.tagName || '').toUpperCase();
    if (tag === 'CODE' || tag === 'PRE' || tag === 'SCRIPT' || tag === 'STYLE' ||
        tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || tag === 'NOSCRIPT') {
      return true;
    }

    if (el.getAttribute && el.getAttribute('contenteditable') === 'true') {
      return true;
    }

    if (el.closest) {
      return !!(
        el.closest('pre') || el.closest('code:not(.IssueLabel):not(.Label)') ||
        el.closest('[contenteditable="true"]') || el.closest('.CodeMirror') ||
        el.closest('[data-testid="code-editor"]') || el.closest('.monaco-editor') ||
        el.closest('.cm-editor') || el.closest('.js-code-editor') ||
        el.closest('.blob-code-inner') || el.closest('.blob-code') ||
        el.closest('.react-code-text')
      );
    }

    return false;
  }

  function hasTranslatableText(el) {
    if (!el || !el.textContent) return false;
    var text = el.textContent.trim();
    return text.length > 0 && text.length < 500;
  }

  function translateAttributes(el) {
    if (!el || !el.hasAttribute) return;

    var attrNames = ['placeholder', 'aria-label', 'title', 'data-tooltip', 'data-content', 'aria-description'];
    for (var i = 0; i < attrNames.length; i++) {
      var attr = attrNames[i];
      if (el.hasAttribute(attr)) {
        var val = el.getAttribute(attr);
        if (val && val.trim() && val.indexOf('{') === -1 && val.indexOf('{{') === -1) {
          var translated = translateText(val.trim());
          if (translated && translated !== val.trim()) {
            if (attr === 'title') {
              el.setAttribute('data-original-title', val);
            }
            el.setAttribute(attr, translated);
          }
        }
      }
    }
  }

  function translateElement(el) {
    if (!el || el.nodeType === Node.COMMENT_NODE) return;

    if (el.nodeType === Node.TEXT_NODE) {
      var text = el.textContent;
      if (!text || !text.trim()) return;

      var parent = el.parentElement;
      if (!parent || isCodeContext(parent)) return;

      var translated = translateText(text);
      if (translated && translated !== text) {
        el.textContent = translated;
        parent.setAttribute(TRANSLATED_ATTR, '1');
      }
      return;
    }

    if (el.nodeType !== Node.ELEMENT_NODE) return;

    var tag = (el.tagName || '').toUpperCase();

    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') return;

    if (tag === 'SVG') {
      var titles = el.getElementsByTagName ? el.getElementsByTagName('title') : [];
      for (var ti = 0; ti < titles.length; ti++) {
        var titleEl = titles[ti];
        if (titleEl.textContent && titleEl.textContent.trim()) {
          var translatedTitle = translateText(titleEl.textContent);
          if (translatedTitle && translatedTitle !== titleEl.textContent) {
            titleEl.textContent = translatedTitle;
          }
        }
      }
      return;
    }

    translateAttributes(el);

    if (isCodeContext(el)) return;

    var childNodes = el.childNodes;
    if (!childNodes || childNodes.length === 0) return;

    var directTextNodes = [];
    var elementChildren = [];

    for (var i = 0; i < childNodes.length; i++) {
      var child = childNodes[i];
      if (child.nodeType === Node.TEXT_NODE) {
        directTextNodes.push(child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        elementChildren.push(child);
      }
    }

    var hasOnlyTextChildren = elementChildren.length === 0 && directTextNodes.length > 0;

    if (hasOnlyTextChildren) {
      var fullText = el.textContent;
      if (fullText && fullText.trim() && !isCodeContext(el)) {
        var translatedFull = translateText(fullText);
        if (translatedFull && translatedFull !== fullText) {
          el.textContent = translatedFull;
          el.setAttribute(TRANSLATED_ATTR, '1');
        }
      }
    }

    if (!hasOnlyTextChildren) {
      for (var j = 0; j < directTextNodes.length; j++) {
        var dtNode = directTextNodes[j];
        var dtText = dtNode.textContent;
        if (!dtText || !dtText.trim()) continue;

        var translatedDt = translateText(dtText);
        if (translatedDt && translatedDt !== dtText) {
          dtNode.textContent = translatedDt;
          el.setAttribute(TRANSLATED_ATTR, '1');
        }
      }
    }

    for (var k = 0; k < elementChildren.length; k++) {
      translateElement(elementChildren[k]);
    }
  }

  var MAX_SHORT_LEN = 300;
  var MAX_LONG_LEN = 5000;

  function isCodeLikeLongText(text) {
    if (!text) return false;
    var lines = text.split('\n');
    if (lines.length > 3) {
      var codeIndicators = /^(\s{2,}|{|}|\/\/|#|\*|\- |>|\$ |`|import |export |function |class |const |let |var |return |if \(|for \(|while \(|try \{|catch \(|@)/m;
      if (codeIndicators.test(text)) return true;
    }
    return false;
  }

  function collectForAi(text, el) {
    if (!text || text.trim().length < 3) return;
    var hasAlpha = /[a-zA-Z]{2,}/.test(text);
    if (!hasAlpha) return;
    var trimmed = text.trim();

    if (trimmed.length > MAX_LONG_LEN) return;

    if (trimmed.length > MAX_SHORT_LEN && isCodeLikeLongText(trimmed)) return;

    var alreadyInQueue = false;
    for (var i = 0; i < aiQueue.length; i++) {
      if (aiQueue[i].text === trimmed) { alreadyInQueue = true; break; }
    }
    if (!alreadyInQueue) {
      aiQueue.push({ text: trimmed, el: el });
    }
  }

  function flushAiQueue() {
    if (aiQueue.length === 0) return;
    var aiTranslator = GITHUB_TRANSLATIONS.aiTranslator;
    if (!aiTranslator || !aiTranslator.isAiEnabled()) return;

    var shortTexts = [];
    var shortEls = [];
    var longTexts = [];
    var longEls = [];

    for (var i = 0; i < aiQueue.length; i++) {
      var item = aiQueue[i];
      if (item.text.length <= MAX_SHORT_LEN) {
        shortTexts.push(item.text);
        shortEls.push(item.el);
      } else {
        longTexts.push(item.text);
        longEls.push(item.el);
      }
    }

    if (shortTexts.length > 0) {
      aiTranslator.queueShortTranslations(shortTexts, shortEls);
    }
    if (longTexts.length > 0) {
      aiTranslator.queueLongTranslations(longTexts, longEls);
    }

    aiQueue = [];
  }

  function translatePage(root) {
    if (!ENABLED) return;
    root = root || document.body;
    if (!root) return;

    aiQueue = [];
    translateElement(root);

    flushAiQueue();

    requestAnimationFrame(function () {
      try {
        if (root.querySelectorAll) {
          var attrEls = root.querySelectorAll('[data-content], [aria-description]');
          for (var i = 0; i < attrEls.length; i++) {
            translateAttributes(attrEls[i]);
          }
        }
      } catch (e) {}

      requestAnimationFrame(function () {
        try {
          if (root.querySelectorAll) {
            var srEls = root.querySelectorAll('.sr-only, .visually-hidden, [aria-hidden="false"].sr-only');
            for (var j = 0; j < srEls.length; j++) {
              var srEl = srEls[j];
              if (srEl.textContent && srEl.textContent.trim() && !isCodeContext(srEl)) {
                var srText = srEl.textContent;
                var translatedSr = translateText(srText);
                if (translatedSr && translatedSr !== srText) {
                  srEl.textContent = translatedSr;
                }
              }
            }
          }
        } catch (e) {}
      });
    });
  }

  function isEnabled() {
    return ENABLED;
  }

  function setEnabled(value) {
    ENABLED = value;
    if (ENABLED) {
      translatePage();
    }
  }

  function toggleEnabled() {
    ENABLED = !ENABLED;
    if (ENABLED) {
      translatePage();
    }
    return ENABLED;
  }

  init();

  GITHUB_TRANSLATIONS.translator = {
    translatePage: translatePage,
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    toggleEnabled: toggleEnabled,
    translateText: translateText,
    getTranslation: getTranslation
  };
})();
