import { analyzeUrl, type RiskAnalysis } from "./lib/riskEngine";

interface TabRiskPayload extends RiskAnalysis {
  url: string;
  checkedAt: string;
}

const TAB_RISK_KEY = "tabRiskById";

type TabRiskStore = Record<number, TabRiskPayload>;

async function getSettings() {
  return chrome.storage.sync.get({ protectionEnabled: true, strictMode: false });
}

async function getTabRiskStore(): Promise<TabRiskStore> {
  const data = await chrome.storage.session.get(TAB_RISK_KEY);
  return (data[TAB_RISK_KEY] as TabRiskStore | undefined) ?? {};
}

async function setTabRisk(tabId: number, payload: TabRiskPayload): Promise<void> {
  const current = await getTabRiskStore();
  current[tabId] = payload;
  await chrome.storage.session.set({ [TAB_RISK_KEY]: current });
}

async function removeTabRisk(tabId: number): Promise<void> {
  const current = await getTabRiskStore();
  delete current[tabId];
  await chrome.storage.session.set({ [TAB_RISK_KEY]: current });
}

async function evaluateTab(tabId: number, url: string): Promise<void> {
  const settings = await getSettings();
  if (!settings.protectionEnabled) {
    await removeTabRisk(tabId);
    return;
  }

  if (!url || !/^https?:\/\//.test(url)) {
    await removeTabRisk(tabId);
    return;
  }

  const result = analyzeUrl(url);
  const payload: TabRiskPayload = {
    ...result,
    url,
    checkedAt: new Date().toISOString()
  };

  await setTabRisk(tabId, payload);

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "SAFEGUARD_RISK_UPDATE",
      payload
    });
  } catch {
    // No content script for browser internal pages.
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab?.url) {
    await evaluateTab(tabId, tab.url);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await removeTabRisk(tabId);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    protectionEnabled: true,
    strictMode: false
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SAFEGUARD_GET_TAB_RISK") {
    chrome.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        sendResponse({ ok: false, error: "No active tab" });
        return;
      }

      const store = await getTabRiskStore();
      const risk = store[activeTab.id] ?? null;
      sendResponse({ ok: true, risk, tabUrl: activeTab.url ?? null });
    });

    return true;
  }

  if (message?.type === "SAFEGUARD_SETTINGS_GET") {
    getSettings().then((settings) => sendResponse({ ok: true, settings }));
    return true;
  }

  if (message?.type === "SAFEGUARD_SETTINGS_SET") {
    chrome.storage.sync.set(message.settings ?? {}).then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
