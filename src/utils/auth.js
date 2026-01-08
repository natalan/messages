/**
 * Authentication utilities
 */

/**
 * Validates Bearer token authorization from request headers
 * @param {Request} req - The incoming request
 * @param {Object} env - Environment variables containing INGEST_TOKEN
 * @returns {boolean} - True if authorized, false otherwise
 */
export function isAuthorized(req, env) {
  const auth = req.headers.get("authorization");
  if (!auth) return false;

  const [type, token] = auth.split(" ");
  if (type !== "Bearer") return false;

  return token === env.INGEST_TOKEN;
}
