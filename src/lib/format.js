export function todayIso() {
  return toIso(new Date());
}

export function toIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseIso(iso) {
  if (!iso || typeof iso !== "string") return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysLeft(iso) {
  const end = parseIso(iso);
  if (!end) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

export function monthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { from: toIso(start), to: toIso(end) };
}

export function yearRange() {
  const year = new Date().getFullYear();
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function formatDate(iso) {
  const date = parseIso(iso);
  if (!date) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(iso) {
  const date = parseIso(iso);
  if (!date) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatMoney(amount) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function parseAmount(input) {
  const raw = String(input ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace("₺", "");
  if (!raw) return NaN;
  let normalized = raw;
  if (raw.includes(",") && raw.includes(".")) {
    normalized =
      raw.lastIndexOf(",") > raw.lastIndexOf(".")
        ? raw.replace(/\./g, "").replace(",", ".")
        : raw.replace(/,/g, "");
  } else if (raw.includes(",")) {
    normalized = raw.replace(",", ".");
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return NaN;
  return Math.round(value * 100) / 100;
}

export function fold(value) {
  return String(value || "").toLocaleLowerCase("tr");
}
