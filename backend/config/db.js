const mongoose = require('mongoose');
const logger = require('./logger');
const { resolveMongoUri, describeMongoTarget } = require('./mongoUri');

/**
 * Ouvre la connexion MongoDB. Les filtres de requête sont assainis.
 * Le processus s'arrête si la connexion échoue.
 * Accepte `MONGO_URI` ou la structure Atlas (`MONGODB_URI`).
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  mongoose.set('sanitizeFilter', true);

  const uri = resolveMongoUri();
  if (!uri) {
    logger.error('mongodb_uri_missing', {
      message: 'Définissez MONGODB_URI (Atlas) ou MONGO_URI.',
    });
    process.exit(1);
  }

  const target = describeMongoTarget(uri);

  try {
    await mongoose.connect(uri);
    logger.info('mongodb_connected', target);
  } catch (err) {
    logger.error('mongodb_connection_failed', { message: err.message, ...target });
    process.exit(1);
  }
};

module.exports = connectDB;
