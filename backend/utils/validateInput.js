const MARKUP = /<\s*\/?\s*[a-z!]|javascript\s*:|\bon[a-z]+\s*=/i;

const MARKUP_MESSAGE = 'Le contenu ne peut pas contenir de code HTML ou JavaScript';

/**
 * Détecte du HTML ou du JavaScript dans un texte saisi par l'utilisateur.
 * @param {string} value Texte à contrôler.
 * @returns {boolean} Vrai si le texte contient une balise, un lien javascript: ou un attribut d'événement.
 */
function containsMarkup(value) {
  return typeof value === 'string' && MARKUP.test(value);
}

module.exports = { containsMarkup, MARKUP_MESSAGE };
