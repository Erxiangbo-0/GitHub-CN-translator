'use strict';

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install') {
    chrome.storage.sync.set({ ghCnEnabled: true });
    chrome.storage.local.set({ ghAiEnabled: false });
  } else if (details.reason === 'update') {
    console.log('[GitHub中文翻译] 插件已更新至版本 ' + chrome.runtime.getManifest().version);
  }
});

chrome.action.onClicked.addListener(function (tab) {
  if (tab.url && (tab.url.indexOf('github.com') > -1 || tab.url.indexOf('github.io') > -1)) {
    chrome.storage.sync.get(['ghCnEnabled'], function (result) {
      var newState = !result.ghCnEnabled;
      chrome.storage.sync.set({ ghCnEnabled: newState });

      var action = newState ? 'enableTranslation' : 'disableTranslation';
      chrome.tabs.sendMessage(tab.id, { action: action }, function () {
        if (chrome.runtime.lastError) {}
      });
    });
  }
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === 'getSettings') {
    chrome.storage.sync.get(['ghCnEnabled'], function (result) {
      sendResponse({ enabled: result.ghCnEnabled !== false });
    });
    return true;
  }

  if (message.action === 'aiProxyFetch') {
    fetch(message.url, {
      method: message.method || 'POST',
      headers: message.headers || {},
      body: message.body || null
    })
      .then(function (response) {
        return response.text().then(function (text) {
          sendResponse({
            success: response.ok,
            status: response.status,
            body: text
          });
        });
      })
      .catch(function (error) {
        sendResponse({
          success: false,
          error: error.message
        });
      });
    return true;
  }
});
