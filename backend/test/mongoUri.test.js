const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveMongoUri, describeMongoTarget } = require('../config/mongoUri');

test('MONGO_URI explicite conserve le nom de base déjà présent', () => {
  const uri = resolveMongoUri({
    MONGO_URI: 'mongodb://mongo:27017/exam_practice_db',
    MONGODB_URI: 'mongodb+srv://cluster.mongodb.net',
    MONGO_DB_NAME: 'exam_practice_prod',
  });

  assert.equal(uri, 'mongodb://mongo:27017/exam_practice_db');
});

test('une URI Atlas sans base reçoit MONGO_DB_NAME', () => {
  const uri = resolveMongoUri({
    MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net',
    MONGO_DB_NAME: 'exam_practice_prod',
  });

  assert.equal(
    uri,
    'mongodb+srv://user:pass@cluster.mongodb.net/exam_practice_prod?retryWrites=true&w=majority',
  );
});

test('les identifiants séparés sont ajoutés lorsque l’URI n’en a pas', () => {
  const uri = resolveMongoUri({
    MONGODB_URI: 'mongodb+srv://cluster.mongodb.net',
    MONGODB_USERNAME: 'user',
    MONGODB_PASSWORD: 'p@ss',
    MONGO_DB_NAME: 'exam_practice_preprod',
  });

  assert.equal(
    uri,
    'mongodb+srv://user:p%40ss@cluster.mongodb.net/exam_practice_preprod?retryWrites=true&w=majority',
  );
});

test('le résumé de connexion masque les identifiants', () => {
  const target = describeMongoTarget(
    'mongodb+srv://user:secret@cluster.mongodb.net/exam_practice_prod',
  );

  assert.deepEqual(target, {
    host: 'cluster.mongodb.net',
    db: 'exam_practice_prod',
  });
});
