const logger = require('../config/logger');

/**
 * Journalise chaque réponse HTTP : méthode, chemin, statut et durée.
 * Le corps n'est pas écrit. Le contrôle de santé reste au niveau debug.
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 */
module.exports = function requestLogger(req, res, next) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    let level = 'info';
    if (req.path === '/api/health') level = 'debug';
    else if (res.statusCode >= 500) level = 'error';
    else if (res.statusCode >= 400) level = 'warn';

    logger.log(level, 'http_request', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip || null,
    });
  });

  next();
};
