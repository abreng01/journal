/**
 * storage.js — JSONBin.io adapter
 *
 * JSONBin stores a single JSON object per "bin".
 * We store everything in one bin as:
 *   { tj_cap: "500000", tj_ent: { "2025-06-01": {...}, ... } }
 *
 * Setup (one-time):
 *   1. Go to https://jsonbin.io and create a free account
 *   2. Click "Create Bin", paste {} as initial content, click Create
 *   3. Copy the Bin ID from the URL (looks like: 6849abc123...)
 *   4. Go to API Keys → create a key, copy it
 *   5. Paste both below
 */

const BIN_ID  = import.meta.env.VITE_JSONBIN_BIN_ID  || "";
const API_KEY = import.meta.env.VITE_JSONBIN_API_KEY  || "";
const BASE    = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

let cache = null;   // in-memory cache so we don't hammer the API

async function readBin() {
  if (cache) return cache;
  const res = await fetch(`${BASE}/latest`, {
    headers: { "X-Master-Key": API_KEY },
  });
  if (!res.ok) throw new Error(`JSONBin read failed: ${res.status}`);
  const json = await res.json();
  cache = json.record || {};
  return cache;
}

async function writeBin(data) {
  cache = data;
  const res = await fetch(BASE, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": API_KEY,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`JSONBin write failed: ${res.status}`);
}

export const storage = {
  async get(key) {
    const data = await readBin();
    const value = data[key];
    if (value === undefined) throw new Error(`Key not found: ${key}`);
    return { key, value };
  },

  async set(key, value) {
    const data = await readBin();
    data[key] = value;
    await writeBin(data);
    return { key, value };
  },

  isConfigured() {
    return BIN_ID !== "" && API_KEY !== "";
  },
};
