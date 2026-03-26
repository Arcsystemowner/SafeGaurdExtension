const SUSPICIOUS_TLDS = new Set([
  "zip",
  "mov",
  "xyz",
  "top",
  "gq",
  "work",
  "click",
  "country"
]);

const TRUSTED_BRANDS = [
  "google",
  "microsoft",
  "apple",
  "amazon",
  "paypal",
  "bankofamerica",
  "chase",
  "netflix",
  "facebook"
];

export type RiskVerdict = "safe" | "caution" | "high-risk";

export interface RiskAnalysis {
  riskScore: number;
  verdict: RiskVerdict;
  reasons: string[];
}

function parseHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function hasIPAddress(hostname: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function suspiciousSubdomainDepth(hostname: string): boolean {
  return hostname.split(".").length > 4;
}

function hasLookalikeBrand(hostname: string): boolean {
  return TRUSTED_BRANDS.some((brand) => {
    if (!hostname.includes(brand)) return false;

    const clean = hostname.replaceAll("-", "").replaceAll(".", "");
    return !clean.endsWith(`${brand}com`) && !clean.endsWith(`${brand}org`);
  });
}

function hasPunycode(hostname: string): boolean {
  return hostname.includes("xn--");
}

function suspiciousPath(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    const query = parsed.search.toLowerCase();

    return (
      /(verify|login|update|wallet|secure|reset-password|gift-card)/.test(path) ||
      /(session=|token=|redirect=|password=)/.test(query)
    );
  } catch {
    return false;
  }
}

export function analyzeUrl(url: string): RiskAnalysis {
  const hostname = parseHostname(url);

  if (!hostname || hostname === "localhost") {
    return {
      riskScore: 0,
      verdict: "safe",
      reasons: []
    };
  }

  const reasons: string[] = [];
  let score = 0;

  if (url.startsWith("http://")) {
    score += 20;
    reasons.push("Connection is not encrypted (HTTP).");
  }

  if (hasIPAddress(hostname)) {
    score += 30;
    reasons.push("Domain uses a raw IP address.");
  }

  if (suspiciousSubdomainDepth(hostname)) {
    score += 15;
    reasons.push("Unusually deep subdomain chain.");
  }

  if (hasPunycode(hostname)) {
    score += 30;
    reasons.push("Contains punycode (possible homograph attack).");
  }

  if (hasLookalikeBrand(hostname)) {
    score += 25;
    reasons.push("Possible brand impersonation in domain name.");
  }

  const tld = hostname.split(".").pop() ?? "";
  if (SUSPICIOUS_TLDS.has(tld)) {
    score += 20;
    reasons.push(`Potentially risky top-level domain (.${tld}).`);
  }

  if (suspiciousPath(url)) {
    score += 10;
    reasons.push("URL path/query contains common phishing keywords.");
  }

  score = Math.min(score, 100);

  let verdict: RiskVerdict = "safe";
  if (score >= 60) {
    verdict = "high-risk";
  } else if (score >= 30) {
    verdict = "caution";
  }

  return {
    riskScore: score,
    verdict,
    reasons
  };
}
