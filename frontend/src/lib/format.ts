import type { DataClass } from "./api/types";

const FIXED_NOW = new Date("2026-08-27T12:00:00Z").getTime(); // stable "now" for the demo dataset

export function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = FIXED_NOW - t;
  const day = 86400000;
  const days = Math.round(diff / day);
  if (Math.abs(days) < 1) return "today";
  if (days === 1) return "yesterday";
  if (days > 0 && days < 45) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (days >= 45 && months < 18) return `${months} month${months > 1 ? "s" : ""} ago`;
  return absoluteDate(iso);
}

export function absoluteDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const CLASS_META: Record<DataClass, { label: string; color: string; short: string }> = {
  public: { label: "Public", color: "var(--color-public)", short: "PUB" },
  internal: { label: "Internal", color: "var(--color-internal)", short: "INT" },
  pii: { label: "PII", color: "var(--color-pii)", short: "PII" },
  secret: { label: "Secret", color: "var(--color-secret)", short: "SEC" },
};

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
