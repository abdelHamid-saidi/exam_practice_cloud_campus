# Journal des évolutions

Toutes les modifications notables de ce projet sont notées ici.

## [1.2.0] - 2026-11-27

### Ajouts

- Pipeline GitHub Actions (`.github/workflows/ci-cd.yml`) : tests, audit du backend, construction des images, publication sur GHCR.
- Déploiement automatisé de la pré-production (branche `develop`, port 8080) et de la production (branche `main`, port 80). Un lancement manuel permet de redéployer l'un ou l'autre.
- `deploy/deploy.sh` et `deploy/docker-compose.yml` : mise à jour des conteneurs sur le serveur, puis contrôle de `GET /api/health`.
- Tests du filtre anti-HTML (`npm test` dans `backend`).

## [1.1.0] - 2026-11-27

### Ajouts

- Journalisation Winston : console, `backend/logs/combined.log`, `error.log` et piste d'audit `audit.log`. Les mots de passe et les jetons sont masqués.
- Journal de chaque requête HTTP. `GET /api/health` vérifie l'API et MongoDB.
- Rotation des journaux Docker (10 Mo, 3 fichiers) et journal d'accès Nginx avec le temps de réponse.
- Script `npm run audit` dans le backend et le frontend.
- Script `npm run docs` : la documentation JSDoc est générée dans `docs/api`.

### Corrections

- L'ajout d'une tâche met la liste à jour tout de suite.
- La suppression utilise `deleteOne` et retire la ligne sans recharger la page.
- Le titre et le statut d'une tâche peuvent être modifiés. Une mise à jour partielle ne vide plus les autres champs.
- Les formulaires vides sont refusés, avec un message visible. Un mot de passe absent ne provoque plus d'erreur 500.
- Les erreurs de connexion et d'inscription s'affichent dans la page. L'inscription confirme le succès.
- Nom d'utilisateur d'au moins 3 caractères et mot de passe d'au moins 6 caractères à l'inscription.
- Un jeton invalide répond 401 et ferme la session. La page des tâches exige une session.
- Le chargement des tâches affiche une erreur au lieu d'une promesse non gérée.
- Le serveur n'écoute qu'après la connexion à MongoDB.
- La barre et le pied de page ne provoquent plus de défilement horizontal.
- L'écran de connexion propose un lien pour créer un compte.

### Sécurité

- Le HTML et le JavaScript sont refusés dans les noms, titres et descriptions.
- Modifier ou supprimer une tâche d'un autre compte répond 403.
- `JWT_SECRET` doit faire au moins 32 caractères. Les valeurs connues sont refusées. Les fichiers `.env` ne sont pas versionnés. Seul l'algorithme HS256 est accepté.
- Le CORS est limité aux origines de `CORS_ORIGIN`. Helmet et Nginx ajoutent les en-têtes de protection.
- `npm audit` du backend : 0 alerte. Frontend : les correctifs sans rupture sont appliqués. Il reste 35 alertes liées à `react-scripts` ; `npm audit fix --force` casserait le build et n'est pas utilisé.

### Documentation

- Les fonctions et routes du backend sont commentées en JSDoc.
- Les composants React ont un commentaire de rôle.
- Cette version du journal regroupe les corrections, les failles et les améliorations.
