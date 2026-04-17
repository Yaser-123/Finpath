const jwt = require('jsonwebtoken');
const { supabase } = require('../lib/supabase');

/**
 * Authenticate requests using a Supabase JWT in the Authorization header.
 * Attaches req.user = { id, email } on success.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.SUPABASE_JWT_SECRET;

    if (secret) {
      try {
        const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
        req.user = { id: decoded.sub, email: decoded.email };
        return next();
      } catch (_) {
        // Fall back to Supabase token introspection when local JWT secret
        // is outdated/misconfigured or project tokens use a different signer.
      }
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = { id: user.id, email: user.email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token', detail: err.message });
  }
}

module.exports = { authenticate };
