import { useEffect, useMemo, useState } from "react";
import type { RiskAnalysis } from "../lib/riskEngine";

type Settings = {
  protectionEnabled: boolean;
  strictMode: boolean;
};

type RiskResponse = {
  ok: boolean;
  risk: RiskAnalysis | null;
  tabUrl: string | null;
};

function cn(...classes: string[]): string {
  return classes.filter(Boolean).join(" ");
}

function getMessage<TResponse>(type: string, payload: Record<string, unknown> = {}): Promise<TResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...payload }, resolve);
  });
}

export function PopupApp() {
  const [site, setSite] = useState("Checking current site...");
  const [risk, setRisk] = useState<RiskAnalysis | null>(null);
  const [settings, setSettings] = useState<Settings>({
    protectionEnabled: true,
    strictMode: false
  });

  const verdict = risk?.verdict ?? "safe";

  const cardTone = useMemo(() => {
    if (verdict === "high-risk") return "border-red-400/70 bg-red-500/10";
    if (verdict === "caution") return "border-amber-400/70 bg-amber-500/10";
    return "border-emerald-400/70 bg-emerald-500/10";
  }, [verdict]);

  useEffect(() => {
    void (async () => {
      const riskRes = await getMessage<RiskResponse>("SAFEGUARD_GET_TAB_RISK");
      if (riskRes?.ok) {
        setSite(riskRes.tabUrl ?? "Unsupported page");
        setRisk(riskRes.risk);
      } else {
        setSite("Unable to read current tab");
      }

      const settingsRes = await getMessage<{ ok: boolean; settings: Settings }>("SAFEGUARD_SETTINGS_GET");
      if (settingsRes?.ok) {
        setSettings(settingsRes.settings);
      }
    })();
  }, []);

  async function updateSettings(next: Settings) {
    setSettings(next);
    await getMessage("SAFEGUARD_SETTINGS_SET", { settings: next });
  }

  return (
    <main className="w-96 bg-slate-950 p-4 text-slate-100">
      <header className="mb-3">
        <h1 className="text-lg font-semibold">SafeGuard Shield</h1>
        <p className="mt-1 text-xs text-slate-400">{site}</p>
      </header>

      <section className={cn("rounded-xl border p-3", cardTone)}>
        <h2 className="text-base font-semibold capitalize">{verdict === "high-risk" ? "High Risk" : verdict}</h2>
        <p className="mt-1 text-sm">Risk score: {risk?.riskScore ?? 0}/100</p>

        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
          {(risk?.reasons.length ?? 0) > 0 ? (
            risk?.reasons.map((reason) => <li key={reason}>{reason}</li>)
          ) : (
            <li>No suspicious indicators detected.</li>
          )}
        </ul>
      </section>

      <section className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm">
        <label className="flex items-center justify-between gap-2">
          <span>Protection enabled</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={settings.protectionEnabled}
            onChange={(event) =>
              void updateSettings({ ...settings, protectionEnabled: event.target.checked })
            }
          />
        </label>

        <label className="flex items-center justify-between gap-2">
          <span>Strict mode</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={settings.strictMode}
            onChange={(event) => void updateSettings({ ...settings, strictMode: event.target.checked })}
          />
        </label>
      </section>
    </main>
  );
}
