const jwt = require('jsonwebtoken');
const { audit } = require('../config/logger');

/**
 * Exige un jeton JWT HS256 dans l'en-tête x-auth-token.
 * Place l'identifiant du compte dans req.user. Répond 401 sinon.
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 */
module.exports = function auth(req, res, next) {
  const token = req.header('x-auth-token');

  if (!token) {
    audit(req, 'auth_denied', {
      outcome: 'denied',
      reason: 'missing_token',
      statusCode: 401,
    });
    return res.status(401).json({ msg: 'Jeton absent, authentification refusée' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded.user;
    next();
  } catch (err) {
    audit(req, 'auth_denied', {
      outcome: 'denied',
      reason: 'invalid_token',
      statusCode: 401,
    });
    res.status(401).json({ msg: 'Jeton invalide' });
  }
};
