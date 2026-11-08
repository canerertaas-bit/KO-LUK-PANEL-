const STORAGE_KEY = "kocluk.vault.v1";
const ITERATIONS = 150000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function emptyData() {
  return {
    brandName: "Koçluk Paneli",
    clients: [],
    transactions: [],
  };
}

export function vaultExists() {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}

export function readVaultPayload() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

export function writeVaultPayload(payload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function eraseVault() {
  localStorage.removeItem(STORAGE_KEY);
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password, salt, iterations) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function isVaultPayload(payload) {
  return Boolean(
    payload &&
      payload.v === 1 &&
      typeof payload.salt === "string" &&
      typeof payload.iv === "string" &&
      typeof payload.data === "string",
  );
}

export async function encryptVault(password, data) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(data))),
  );
  return {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iter: ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(cipher),
  };
}

export async function decryptVault(password, payload) {
  if (!isVaultPayload(payload)) throw new Error("format");
  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const cipher = base64ToBytes(payload.data);
  const key = await deriveKey(password, salt, payload.iter || ITERATIONS);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return normalizeData(JSON.parse(decoder.decode(plain)));
}

function normalizeClient(client) {
  if (!client || typeof client.id !== "string" || typeof client.name !== "string") return null;
  if (client.group !== "online" && client.group !== "private") return null;
  const base = {
    id: client.id,
    group: client.group,
    name: client.name,
    packageName: String(client.packageName || ""),
    phone: String(client.phone || ""),
    note: String(client.note || ""),
    status: client.status === "passive" ? "passive" : "active",
    createdAt: String(client.createdAt || new Date().toISOString()),
  };
  if (client.group === "online") {
    return {
      ...base,
      startDate: String(client.startDate || ""),
      endDate: String(client.endDate || ""),
    };
  }
  const total = Math.max(0, Number(client.totalLessons) || 0);
  const remaining = Math.min(total, Math.max(0, Number(client.remainingLessons) || 0));
  return { ...base, totalLessons: total, remainingLessons: remaining };
}

function normalizeTransaction(entry) {
  if (!entry || typeof entry.id !== "string") return null;
  if (entry.type !== "income" && entry.type !== "expense") return null;
  const amount = Number(entry.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    id: entry.id,
    type: entry.type,
    amount: Math.round(amount * 100) / 100,
    date: String(entry.date || ""),
    category: String(entry.category || ""),
    note: String(entry.note || ""),
    clientId: entry.clientId ? String(entry.clientId) : "",
    createdAt: String(entry.createdAt || new Date().toISOString()),
  };
}

export function normalizeData(raw) {
  const base = emptyData();
  if (!raw || typeof raw !== "object") return base;
  const brandName = typeof raw.brandName === "string" ? raw.brandName.trim() : "";
  return {
    brandName: brandName || base.brandName,
    clients: Array.isArray(raw.clients) ? raw.clients.map(normalizeClient).filter(Boolean) : [],
    transactions: Array.isArray(raw.transactions)
      ? raw.transactions.map(normalizeTransaction).filter(Boolean)
      : [],
  };
}
