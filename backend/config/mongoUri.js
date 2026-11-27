/**
 * Retire les guillemets qu'Atlas ajoute parfois autour d'une variable.
 * @param {string} value
 * @returns {string}
 */
function unquote(value) {
  const trimmed = String(value || '').trim();
  const quoted = (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return quoted ? trimmed.slice(1, -1) : trimmed;
}

/**
 * Ajoute l'utilisateur Atlas si la chaîne n'a pas encore d'identifiants.
 * @param {string} uri
 * @param {NodeJS.ProcessEnv} env
 * @returns {string}
 */
function withCredentials(uri, env) {
  if (!uri || /^mongodb(?:\+srv)?:\/\/[^/]+@/.test(uri)) return uri;

  const user = unquote(env.MONGODB_USERNAME || '');
  const password = unquote(env.MONGODB_PASSWORD || '');
  if (!user || !password) return uri;

  return uri.replace(
    /^(mongodb(?:\+srv)?:\/\/)/,
    `$1${encodeURIComponent(user)}:${encodeURIComponent(password)}@`
  );
}

/**
 * Nom de base par défaut : qualification Atlas, ou base locale.
 * @param {string} uri
 * @param {NodeJS.ProcessEnv} env
 * @returns {string}
 */
function databaseName(uri, env) {
  const configured = unquote(env.MONGO_DB_NAME || '');
  if (configured) return configured;
  return /mongodb\.net|mongodb\+srv/i.test(uri) ? 'exam_practice_preprod' : 'exam_practice_db';
}

/**
 * Complète une URI Atlas sans chemin (`...mongodb.net`) avec le nom de la base.
 * Une URI qui nomme déjà sa base est laissée intacte.
 * @param {string} uri
 * @param {string} dbName
 * @returns {string}
 */
function ensureDatabase(uri, dbName) {
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/[^/?]+)(\/[^?]*)?(\?.*)?$/);
  if (!match) return uri;

  const [, base, path = '', query = ''] = match;
  if (path.replace(/^\//, '')) return uri;

  const params = query || '?retryWrites=true&w=majority';
  return `${base}/${dbName}${params}`;
}

/**
 * Choisit la chaîne MongoDB.
 * `MONGO_URI` (local, Docker) prime. Sinon la structure Atlas :
 * `MONGODB_URI`, avec `MONGODB_USERNAME` et `MONGODB_PASSWORD` si l'URI n'a pas d'identifiants.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string} Chaîne prête pour Mongoose, ou une chaîne vide si rien n'est défini.
 */
function resolveMongoUri(env = process.env) {
  const explicit = unquote(env.MONGO_URI || '');
  const atlas = withCredentials(unquote(env.MONGODB_URI || ''), env);
  const uri = explicit || atlas;
  if (!uri) return '';
  return ensureDatabase(uri, databaseName(uri, env));
}

/**
 * Hôte et base, sans identifiants, pour les journaux.
 * @param {string} uri
 * @returns {{ host: string, db: string|null }}
 */
function describeMongoTarget(uri) {
  const match = String(uri).match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?([^/?]+)(?:\/([^?]*))?/);
  return {
    host: match ? match[1] : 'inconnu',
    db: match && match[2] ? match[2] : null,
  };
}

module.exports = {
  resolveMongoUri,
  describeMongoTarget,
};
