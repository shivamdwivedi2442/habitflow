/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */
const crypto = require("crypto");
const { verifyOwnershipIntegrity } = require("./ownership");

const APP_SECRET_KEY = process.env.APP_SECRET_KEY || "habitflow-supabase-shivam-secret-2026";
const TOKEN_EXPIRY_SECONDS = parseInt(process.env.TOKEN_EXPIRY_SECONDS || "604800", 10);

function deriveSigningKey() {
  const meta = verifyOwnershipIntegrity();
  return crypto
    .createHash("sha256")
    .update(`${APP_SECRET_KEY}:${meta.signature}:${meta.handle}`, "utf8")
    .digest();
}

function hashPassword(password, salt = null) {
  const actualSalt = salt || crypto.randomBytes(16).toString("hex");
  const derived = crypto
    .pbkdf2Sync(String(password), actualSalt, 120000, 32, "sha256")
    .toString("hex");
  return `pbkdf2_sha256$120000$${actualSalt}$${derived}`;
}

function verifyPassword(password, storedHash) {
  try {
    const parts = String(storedHash).split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") return false;
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const expectedHex = parts[3];
    const actualHex = crypto
      .pbkdf2Sync(String(password), salt, iterations, 32, "sha256")
      .toString("hex");
    const a = Buffer.from(actualHex, "hex");
    const b = Buffer.from(expectedHex, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function createAccessToken(userId, email) {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    email,
    iat: nowSec,
    exp: nowSec + TOKEN_EXPIRY_SECONDS,
    jti: crypto.randomBytes(8).toString("hex")
  };
  const b64Payload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", deriveSigningKey())
    .update(b64Payload, "utf8")
    .digest("hex");
  return `${b64Payload}.${sig}`;
}

function decodeAccessToken(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 2) return null;
    const [b64Payload, sig] = parts;
    const expectedSig = crypto
      .createHmac("sha256", deriveSigningKey())
      .update(b64Payload, "utf8")
      .digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(b64Payload, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// XSS & Prototype Pollution Sanitizer
function sanitizeValue(val) {
  if (typeof val === "string") {
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "");
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val !== null && typeof val === "object") {
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      clean[k] = sanitizeValue(v);
    }
    return clean;
  }
  return val;
}

// Sliding Window Rate Limiter
class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 120) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map();
  }

  check(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = (this.hits.get(key) || []).filter((t) => t > windowStart);
    if (timestamps.length >= this.maxRequests) {
      this.hits.set(key, timestamps);
      return { allowed: false, remaining: 0 };
    }
    timestamps.push(now);
    this.hits.set(key, timestamps);
    return { allowed: true, remaining: this.maxRequests - timestamps.length };
  }

  reset() {
    this.hits.clear();
  }
}

const apiLimiter = new RateLimiter(60000, 180);
const authLimiter = new RateLimiter(60000, 25);

function applySecurityHeaders(req, res) {
  const meta = verifyOwnershipIntegrity();
  res.setHeader("X-HabitFlow-Author", meta.author);
  res.setHeader("X-HabitFlow-GitHub", meta.github);
  res.setHeader("X-HabitFlow-Signature", meta.verification_token);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(self), camera=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;"
  );
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}

module.exports = {
  hashPassword,
  verifyPassword,
  createAccessToken,
  decodeAccessToken,
  sanitizeValue,
  apiLimiter,
  authLimiter,
  applySecurityHeaders,
  RateLimiter
};
