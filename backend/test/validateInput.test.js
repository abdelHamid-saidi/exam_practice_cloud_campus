const test = require('node:test');
const assert = require('node:assert/strict');
const { containsMarkup } = require('../utils/validateInput');

test('refuse une balise HTML', () => {
  assert.equal(containsMarkup('<script>alert(1)</script>'), true);
});

test('refuse un lien javascript: et un attribut d’événement', () => {
  assert.equal(containsMarkup('javascript:alert(1)'), true);
  assert.equal(containsMarkup('cliquez <img onerror=alert(1)>'), true);
});

test('accepte un titre ordinaire', () => {
  assert.equal(containsMarkup('Acheter du lait'), false);
  assert.equal(containsMarkup(''), false);
});

test('ignore ce qui n’est pas du texte', () => {
  assert.equal(containsMarkup(null), false);
  assert.equal(containsMarkup(12), false);
});
