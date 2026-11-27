const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');
const { audit } = require('../config/logger');
const { containsMarkup, MARKUP_MESSAGE } = require('../utils/validateInput');

/**
 * Signe un jeton valable une heure et l'envoie au client.
 * @param {object} user Compte qui vient d'être authentifié.
 * @param {object} res Réponse HTTP.
 */
function signToken(user, res) {
  const payload = { user: { id: user.id } };
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => {
    if (err) {
      logger.error('jwt_sign_failed', { message: err.message });
      return res.status(500).json({ msg: 'Erreur serveur' });
    }
    return res.json({ token });
  });
}

/**
 * @route   POST /api/auth/register
 * @desc    Crée un compte puis renvoie un jeton JWT.
 *          Le nom d'utilisateur (3 caractères minimum) et le mot de passe
 *          (6 à 72 caractères) sont obligatoires.
 */
router.post('/register', async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    audit(req, 'user_register_failed', {
      outcome: 'failure',
      reason: 'missing_fields',
      username: username || null,
      statusCode: 400,
    });
    return res.status(400).json({ msg: 'Veuillez renseigner le nom d\'utilisateur et le mot de passe' });
  }

  if (containsMarkup(username)) {
    audit(req, 'user_register_failed', {
      outcome: 'failure',
      reason: 'validation',
      statusCode: 400,
    });
    return res.status(400).json({ msg: MARKUP_MESSAGE });
  }

  if (username.length < 3) {
    audit(req, 'user_register_failed', {
      outcome: 'failure',
      reason: 'validation',
      username,
      statusCode: 400,
    });
    return res.status(400).json({ msg: 'Le nom d\'utilisateur doit contenir au moins 3 caractères' });
  }

  if (password.length < 6) {
    audit(req, 'user_register_failed', {
      outcome: 'failure',
      reason: 'validation',
      username,
      statusCode: 400,
    });
    return res.status(400).json({ msg: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  if (password.length > 72) {
    audit(req, 'user_register_failed', {
      outcome: 'failure',
      reason: 'validation',
      username,
      statusCode: 400,
    });
    return res.status(400).json({ msg: 'Le mot de passe ne doit pas dépasser 72 caractères' });
  }

  try {
    let user = await User.findOne({ username });
    if (user) {
      audit(req, 'user_register_failed', {
        outcome: 'failure',
        reason: 'duplicate',
        username,
        statusCode: 400,
      });
      return res.status(400).json({ msg: 'Ce nom d\'utilisateur est déjà utilisé' });
    }

    user = new User({ username, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    audit(req, 'user_registered', {
      outcome: 'success',
      username,
      userId: user.id,
      statusCode: 200,
    });

    signToken(user, res);
  } catch (err) {
    if (err.code === 11000) {
      audit(req, 'user_register_failed', {
        outcome: 'failure',
        reason: 'duplicate',
        username,
        statusCode: 400,
      });
      return res.status(400).json({ msg: 'Ce nom d\'utilisateur est déjà utilisé' });
    }
    logger.error('register_failed', { message: err.message, stack: err.stack });
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Vérifie le nom d'utilisateur et le mot de passe, puis renvoie un jeton JWT.
 *          Un formulaire vide reçoit une erreur explicite. Un échec d'authentification
 *          reste volontairement générique.
 */
router.post('/login', async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    audit(req, 'user_login_failed', {
      outcome: 'failure',
      reason: 'missing_fields',
      username: username || null,
      statusCode: 400,
    });
    return res.status(400).json({ msg: 'Veuillez renseigner le nom d\'utilisateur et le mot de passe' });
  }

  try {
    const user = await User.findOne({ username });
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isMatch) {
      audit(req, 'user_login_failed', {
        outcome: 'failure',
        reason: 'bad_credentials',
        username,
        statusCode: 400,
      });
      return res.status(400).json({ msg: 'Nom d\'utilisateur ou mot de passe incorrect' });
    }

    audit(req, 'user_login', {
      outcome: 'success',
      username,
      userId: user.id,
      statusCode: 200,
    });

    signToken(user, res);
  } catch (err) {
    logger.error('login_failed', { message: err.message, stack: err.stack });
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

module.exports = router;
