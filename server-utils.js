// Shared, dependency-free utilities for Vercel Node.js functions.
'use strict';
const rateMap = new Map();

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.end(JSON.stringify(data));
}
function json(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}
function clientKey(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers?.['x-real-ip'] || 'unknown');
}
function rateLimit(req, res, bucket, limit = 20, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const key = `${bucket}:${clientKey(req)}`;
  let entry = rateMap.get(key);
  if (!entry || now - entry.start > windowMs) entry = { start: now, count: 0 };
  entry.count += 1;
  rateMap.set(key, entry);
  if (rateMap.size > 5000) {
    for (const [k, v] of rateMap) if (now - v.start > windowMs) rateMap.delete(k);
  }
  if (entry.count > limit) {
    const retry = Math.max(1, Math.ceil((windowMs - (now - entry.start)) / 1000));
    send(res, 429, { error: `Rate limit reached for this server instance. Try again in about ${retry}s.` });
    return false;
  }
  return true;
}
function getKeys() {
  return ['GEMINI_KEY', 'GEMINI_KEY2', 'GEMINI_KEY3'].map(n => String(process.env[n] || '').trim()).filter(Boolean);
}
async function geminiRequest(model, body, options = {}) {
  const keys = getKeys();
  if (!keys.length) {
    const err = new Error('Gemini API is not configured. Add GEMINI_KEY (and optionally GEMINI_KEY2 / GEMINI_KEY3) in Vercel Project Settings → Environment Variables.');
    err.status = 503; throw err;
  }
  const timeoutMs = options.timeoutMs || 60000;
  let lastError;
  for (let i = 0; i < keys.length; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[i] }, body: JSON.stringify(body), signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) return payload;
      const message = payload?.error?.message || `Gemini API returned HTTP ${response.status}`;
      const err = new Error(message); err.status = response.status; lastError = err;
      // Rotate only for key/quota/transient problems. Do not mask malformed model requests.
      if (![401, 403, 429, 500, 502, 503, 504].includes(response.status) || i === keys.length - 1) throw err;
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError') { const timeout = new Error('Gemini request timed out. Try a shorter prompt.'); timeout.status = 504; throw timeout; }
      if (err.status && ![401, 403, 429, 500, 502, 503, 504].includes(err.status)) throw err;
      if (i === keys.length - 1) throw err;
    } finally { clearTimeout(timer); }
  }
  throw lastError || new Error('Gemini request failed.');
}
function extractText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts.map(p => p.text || '').join('\n').trim();
}
function parseJsonText(text) {
  let clean = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean); } catch {}
  const start = clean.indexOf('{'); const end = clean.lastIndexOf('}');
  if (start >= 0 && end > start) { try { return JSON.parse(clean.slice(start, end + 1)); } catch {} }
  throw new Error('Gemini returned an invalid storyboard format. Please try again.');
}
function capText(v, n) { return String(v || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, n); }
function decodeBase64Audio(value, maxBytes = 3_300_000) {
  const s = String(value || '').replace(/^data:[^,]+,/, '').trim();
  if (!s) { const e = new Error('Audio payload is required.'); e.status = 400; throw e; }
  if (s.length > Math.ceil(maxBytes * 4 / 3) + 8) { const e = new Error('Audio payload is too large. Keep each voice track under roughly 2 minutes.'); e.status = 413; throw e; }
  const buf = Buffer.from(s, 'base64');
  if (!buf.length || buf.length > maxBytes) { const e = new Error('Audio payload is invalid or exceeds the 3.3 MB safety limit.'); e.status = 413; throw e; }
  return buf;
}
module.exports = { send, json, rateLimit, getKeys, geminiRequest, extractText, parseJsonText, capText, decodeBase64Audio };
