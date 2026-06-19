import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  // Cap display at 95 — no product should ever show 100
  const capped = Math.min(95, Math.max(0, score));
  return capped.toFixed(1);
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  if (amount >= 1_000_000) return `ETB ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `ETB ${(amount / 1_000).toFixed(1)}K`;
  return `ETB ${amount.toFixed(2)}`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export function getTierColor(tier: string | null | undefined): string {
  switch (tier) {
    case "HIGH": return "text-tier-high bg-tier-high-bg";
    case "MEDIUM": return "text-tier-medium bg-tier-medium-bg";
    case "LOW": return "text-tier-low bg-tier-low-bg";
    default: return "text-gray-600 bg-gray-100";
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case "critical": return "text-severity-critical bg-severity-critical-bg";
    case "high": return "text-severity-high bg-severity-high-bg";
    case "medium": return "text-severity-medium bg-severity-medium-bg";
    case "low": return "text-severity-low bg-severity-low-bg";
    default: return "text-gray-600 bg-gray-100";
  }
}

export function formatCategoryName(category: string): string {
  const map: Record<string, string> = {
    mobile_banking: "Mobile Banking",
    card_banking: "Card Banking",
    atm: "ATM",
    pos: "POS",
    qr_payment: "QR Payment",
    digital_wallet: "Digital Wallet",
    future_product: "Future Product",
    ussd: "USSD",
  };
  // Known mapping first; for any free-form channel, convert snake_case to Title Case
  return map[category] || category
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatRoleName(role: string): string {
  const map: Record<string, string> = {
    super_admin: "Super Admin",
    executive_management: "Executive Management",
    product_manager: "Product Manager",
    data_engineer: "Data Engineer",
    ml_engineer: "ML Engineer",
    risk_team: "Risk Team",
    compliance_team: "Compliance Team",
  };
  return map[role] || role;
}
