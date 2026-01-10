/**
 * Authentication utilities
 */

/**
 * Validates Bearer token authorization from request headers
 * Supports token rotation by checking both current and old tokens
 * @param {Request} req - The incoming request
 * @param {Object} env - Environment variables containing INGEST_TOKEN and optionally INGEST_TOKEN_OLD
 * @returns {boolean} - True if authorized, false otherwise
 */
export function isAuthorized(req, env) {
  const auth = req.headers.get("authorization");
  if (!auth) return false;

  const [type, token] = auth.split(" ");
  if (type !== "Bearer") return false;

  // Check current token
  if (env.INGEST_TOKEN && token === env.INGEST_TOKEN) {
    return true;
  }

  // Check old token (for rotation support)
  if (env.INGEST_TOKEN_OLD && token === env.INGEST_TOKEN_OLD) {
    return true;
  }

  return false;
}
