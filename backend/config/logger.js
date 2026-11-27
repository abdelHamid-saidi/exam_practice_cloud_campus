const fs = require('fs');
const path = require('path');
const winston = require('winston');

const logDir = path.join(__dirname, '..', 'logs');
const level = process.env.LOG_LEVEL || 'info';

const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'jwt', 'secret', 'cookie'];

const redactFormat = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (SENSITIVE_KEYS.includes(String(key).toLowerCase())) {
      info[key] = '[REDACTED]';
    }
  }
  return info;
});

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  redactFormat(),
  winston.format.json()
);

const consoleFormat = process.env.NODE_ENV === 'production'
  ? jsonFormat
  : winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      redactFormat(),
      winston.format.colorize(),
      winston.format.printf((info) => {
        const { timestamp, level: lvl, message, stack, service, ...meta } = info;
        const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${lvl} ${message}${stack ? `\n${stack}` : ''}${extra}`;
      })
    );

function fileLoggingEnabled() {
  if (process.env.LOG_TO_FILE === 'false') return false;
  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.accessSync(logDir, fs.constants.W_OK);
    return true;
  } catch (err) {
    console.error(`Journal fichier indisponible (${err.message}). Sortie console uniquement.`);
    return false;
  }
}

const writeFiles = fileLoggingEnabled();

function fileTransport(filename, options = {}) {
  return new winston.transports.File({
    filename: path.join(logDir, filename),
    maxsize: 5 * 1024 * 1024,
    maxFiles: 5,
    tailable: true,
    ...options,
  });
}

const appTransports = [new winston.transports.Console({ format: consoleFormat })];
if (writeFiles) {
  appTransports.push(
    fileTransport('error.log', { level: 'error', format: jsonFormat }),
    fileTransport('combined.log', { format: jsonFormat })
  );
}

const logger = winston.createLogger({
  level,
  exitOnError: false,
  defaultMeta: { service: 'task-api' },
  format: jsonFormat,
  transports: appTransports,
});

const auditTransports = [new winston.transports.Console({ format: consoleFormat })];
if (writeFiles) {
  auditTransports.push(fileTransport('audit.log', { format: jsonFormat }));
}

const auditLogger = winston.createLogger({
  level: 'info',
  exitOnError: false,
  defaultMeta: { service: 'task-api', channel: 'audit' },
  format: jsonFormat,
  transports: auditTransports,
});

/**
 * Enregistre une action sensible (connexion, tâche, refus d'accès).
 * Le mot de passe et le jeton sont retirés avant l'écriture.
 * @param {object} req Requête en cours.
 * @param {string} event Nom de l'événement, par exemple user_login.
 * @param {object} [fields] Détails : outcome, reason, userId, username, resourceId, statusCode.
 */
function audit(req, event, fields = {}) {
  const safe = { ...fields };
  delete safe.password;
  delete safe.token;

  auditLogger.info(event, {
    outcome: safe.outcome || 'success',
    reason: safe.reason || null,
    userId: safe.userId || req.user?.id || null,
    username: safe.username || null,
    resourceId: safe.resourceId || null,
    statusCode: safe.statusCode || null,
    ip: req.ip || null,
    method: req.method,
    path: req.originalUrl,
  });
}

logger.info('logging_ready', {
  level,
  fileLogging: writeFiles,
  logDir: writeFiles ? logDir : null,
});

module.exports = logger;
module.exports.audit = audit;
