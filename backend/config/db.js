const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Ouvre la connexion MongoDB. Les filtres de requête sont assainis.
 * Le processus s'arrête si la connexion échoue.
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  mongoose.set('sanitizeFilter', true);

  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('mongodb_connected');
  } catch (err) {
    logger.error('mongodb_connection_failed', { message: err.message });
    process.exit(1);
  }
};

module.exports = connectDB;
