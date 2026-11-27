require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const logger = require('./config/logger');
const requestLogger = require('./middleware/requestLogger');
const connectDB = require('./config/db');

const WEAK_JWT_SECRETS = new Set([
  'secret',
  'secretkey123',
  'change-me-in-production',
  'changeme',
  'password',
]);

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(requestLogger);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const error = new Error('Origine non autorisée');
    error.status = 403;
    return callback(error);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token'],
}));
app.use(express.json({ limit: '100kb' }));

/**
 * Indique si l'API et MongoDB répondent.
 * @route GET /api/health
 */
app.get('/api/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'degraded',
    db: dbUp ? 'up' : 'down',
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));

app.use((req, res) => {
  res.status(404).json({ msg: 'Route introuvable' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const invalidJson = err.type === 'entity.parse.failed' || err instanceof SyntaxError;
  const status = invalidJson ? 400 : err.status || err.statusCode || 500;

  if (status >= 500) {
    logger.error('unhandled_error', {
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      statusCode: status,
    });
  } else if (invalidJson) {
    logger.warn('invalid_json', { path: req.originalUrl, message: err.message });
  } else {
    logger.warn('request_rejected', {
      message: err.message,
      path: req.originalUrl,
      statusCode: status,
    });
  }

  const msg = status === 403
    ? 'Origine non autorisée'
    : status === 500
      ? 'Erreur serveur'
      : 'Requête invalide';

  res.status(status).json({ msg });
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  logger.error('unhandled_rejection', { message });
});

process.on('uncaughtException', (err) => {
  logger.error('uncaught_exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

/**
 * Arrête le serveur si JWT_SECRET est absent, trop court ou égal à une valeur connue.
 */
function assertStrongJwtSecret() {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 32 || WEAK_JWT_SECRETS.has(secret)) {
    logger.error('JWT_SECRET absent ou trop faible. Utilisez une valeur aléatoire d\'au moins 32 caractères.');
    process.exit(1);
  }
}

async function start() {
  assertStrongJwtSecret();
  logger.info('cors_configured', { origins: allowedOrigins });

  await connectDB();
  app.listen(PORT, () => {
    logger.info('server_started', { port: Number(PORT) });
  });
}

start();
