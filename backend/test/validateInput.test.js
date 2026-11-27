const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { containsMarkup, MARKUP_MESSAGE } = require('../utils/validateInput');

describe('containsMarkup', () => {
  it('accepte un texte ordinaire', () => {
    assert.equal(containsMarkup('Acheter du pain'), false);
  });

  it('accepte une chaîne vide', () => {
    assert.equal(containsMarkup(''), false);
  });

  it('ignore les valeurs qui ne sont pas du texte', () => {
    assert.equal(containsMarkup(null), false);
    assert.equal(containsMarkup(undefined), false);
    assert.equal(containsMarkup(12), false);
  });

  it('refuse une balise HTML', () => {
    assert.equal(containsMarkup('<script>alert(1)</script>'), true);
    assert.equal(containsMarkup('bonjour <b>monde</b>'), true);
  });

  it('refuse un lien javascript:', () => {
    assert.equal(containsMarkup('javascript:alert(1)'), true);
  });

  it('refuse un attribut d’événement', () => {
    assert.equal(containsMarkup('onclick=alert(1)'), true);
  });
});

describe('MARKUP_MESSAGE', () => {
  it('expose le message renvoyé par l’API', () => {
    assert.equal(
      MARKUP_MESSAGE,
      'Le contenu ne peut pas contenir de code HTML ou JavaScript',
    );
  });
});
