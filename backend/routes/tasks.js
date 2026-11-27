const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const logger = require('../config/logger');
const { audit } = require('../config/logger');
const { containsMarkup, MARKUP_MESSAGE } = require('../utils/validateInput');

function rejectMarkup(req, res, event) {
  audit(req, event, {
    outcome: 'failure',
    reason: 'validation',
    statusCode: 400,
  });
  res.status(400).json({ msg: MARKUP_MESSAGE });
}

/**
 * Indique si la tâche appartient au compte porté par le jeton.
 * @param {object} task
 * @param {object} req
 * @returns {boolean}
 */
function isOwner(task, req) {
  return task.user && task.user.toString() === req.user.id;
}

function rejectForeignTask(req, res, task, event) {
  audit(req, event, {
    outcome: 'denied',
    reason: 'not_owner',
    resourceId: task.id,
    statusCode: 403,
  });
  res.status(403).json({ msg: 'Accès refusé' });
}

/**
 * Liste les tâches du compte connecté, de la plus récente à la plus ancienne.
 * @route GET /api/tasks
 */
router.get('/', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    logger.error('tasks_list_failed', { message: err.message, stack: err.stack });
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

/**
 * Crée une tâche. Le titre est obligatoire et ne peut pas contenir de HTML.
 * @route POST /api/tasks
 */
router.post('/', auth, async (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';

  if (!title) {
    audit(req, 'task_create_failed', {
      outcome: 'failure',
      reason: 'validation',
      statusCode: 400,
    });
    return res.status(400).json({ msg: 'Le titre est obligatoire' });
  }

  if (containsMarkup(title) || containsMarkup(description)) {
    return rejectMarkup(req, res, 'task_create_failed');
  }

  if (title.length > 200) {
    return res.status(400).json({ msg: 'Le titre ne doit pas dépasser 200 caractères' });
  }

  try {
    const task = await new Task({
      title,
      description,
      user: req.user.id,
    }).save();

    audit(req, 'task_created', {
      outcome: 'success',
      resourceId: task.id,
      statusCode: 200,
    });
    res.json(task);
  } catch (err) {
    logger.error('task_create_failed', { message: err.message, stack: err.stack });
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

/**
 * Met à jour le titre, la description ou le statut.
 * Seul le propriétaire peut modifier la tâche, et seuls les champs envoyés changent.
 * @route PUT /api/tasks/:id
 */
router.put('/:id', auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ msg: 'Identifiant de tâche invalide' });
  }

  const { title, description, isCompleted } = req.body;

  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Tâche introuvable' });
    if (!isOwner(task, req)) return rejectForeignTask(req, res, task, 'task_update_denied');

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ msg: 'Le titre est obligatoire' });
      }
      if (title.trim().length > 200) {
        return res.status(400).json({ msg: 'Le titre ne doit pas dépasser 200 caractères' });
      }
      if (containsMarkup(title)) {
        return rejectMarkup(req, res, 'task_update_failed');
      }
      task.title = title.trim();
    }

    if (description !== undefined) {
      const nextDescription = typeof description === 'string' ? description.trim() : '';
      if (containsMarkup(nextDescription)) {
        return rejectMarkup(req, res, 'task_update_failed');
      }
      task.description = nextDescription;
    }

    if (isCompleted !== undefined) {
      if (typeof isCompleted !== 'boolean') {
        return res.status(400).json({ msg: 'Le statut doit être un booléen' });
      }
      task.isCompleted = isCompleted;
    }

    await task.save();

    audit(req, 'task_updated', {
      outcome: 'success',
      resourceId: task.id,
      statusCode: 200,
    });
    res.json(task);
  } catch (err) {
    logger.error('task_update_failed', { message: err.message, stack: err.stack });
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

/**
 * Supprime une tâche du compte connecté.
 * @route DELETE /api/tasks/:id
 */
router.delete('/:id', auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ msg: 'Identifiant de tâche invalide' });
  }

  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Tâche introuvable' });
    if (!isOwner(task, req)) return rejectForeignTask(req, res, task, 'task_delete_denied');

    await task.deleteOne();

    audit(req, 'task_deleted', {
      outcome: 'success',
      resourceId: req.params.id,
      statusCode: 200,
    });
    res.json({ msg: 'Tâche supprimée' });
  } catch (err) {
    logger.error('task_delete_failed', { message: err.message, stack: err.stack });
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

module.exports = router;
