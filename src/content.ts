import type { RiskAnalysis } from "./lib/riskEngine";

interface RiskMessage {
  type: "SAFEGUARD_RISK_UPDATE";
  payload: RiskAnalysis;
}

let currentBanner: HTMLDivElement | null = null;

function buildBanner(risk: RiskAnalysis): HTMLDivElement {
  const banner = document.createElement("div");
  banner.id = "safeguard-warning-banner";

  const isHighRisk = risk.verdict === "high-risk";
  banner.style.cssText = `
    position: fixed;
    inset: 0 auto auto 0;
    width: 100%;
    z-index: 2147483647;
    background: ${isHighRisk ? "#b00020" : "#ff8f00"};
    color: #fff;
    font-family: Inter, system-ui, -apple-system, sans-serif;
    font-size: 14px;
    box-sizing: border-box;
    box-shadow: 0 2px 8px rgba(0,0,0,0.28);
    padding: 10px 14px;
  `;

  const title = isHighRisk ? "High-risk website detected" : "Caution: suspicious website signals";
  banner.innerHTML = `
    <strong>SafeGuard Shield:</strong> ${title} (score: ${risk.riskScore}/100)
    <div style="margin-top:6px;opacity:0.95">${risk.reasons.join(" • ")}</div>
    <button id="safeguard-close-btn" style="
      margin-top:8px;
      border:none;
      background:#fff;
      color:#111;
      padding:5px 10px;
      border-radius:6px;
      cursor:pointer;
      font-weight:600;
    ">Dismiss</button>
  `;

  return banner;
}

function renderBanner(risk: RiskAnalysis): void {
  if (currentBanner) {
    currentBanner.remove();
    currentBanner = null;
  }

  if (risk.verdict !== "caution" && risk.verdict !== "high-risk") {
    return;
  }

  const banner = buildBanner(risk);
  document.documentElement.appendChild(banner);

  const closeButton = banner.querySelector<HTMLButtonElement>("#safeguard-close-btn");
  closeButton?.addEventListener("click", () => {
    banner.remove();
    currentBanner = null;
  });

  currentBanner = banner;
}

chrome.runtime.onMessage.addListener((message: RiskMessage) => {
  if (message?.type === "SAFEGUARD_RISK_UPDATE") {
    renderBanner(message.payload);
  }
});
