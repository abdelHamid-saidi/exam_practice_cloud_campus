
# Projet d'Entraînement : Application de Gestion de Tâches

Bienvenue sur le projet d'entraînement pour l'évaluation "Mise en production et maintenance applicative". Cette application est une simple "To-Do List" composée d'un frontend en React et d'un backend en Node.js/Express.

**Important** : Cette application a été intentionnellement conçue avec des bugs, des failles de sécurité et des mauvaises pratiques. La mission est de l'améliorer en suivant les consignes ci-dessous et de la mettre en production.

## 1. Installation et lancement

Deux modes sont possibles. Ils utilisent les mêmes ports : ne les lancez pas en même temps.

| Service | URL |
|---|---|
| Application | http://localhost:3000 |
| API | http://localhost:5000 |
| MongoDB | `localhost:27017` (base `exam_practice_db`) |

### a. Docker (environnement complet)

Prérequis : Docker Desktop.

À la racine du projet :

```bash
docker compose up -d --build
```

Compose démarre trois services :

- **mongo** : image `mongo:7`, données conservées dans le volume `mongo_data`. Le backend attend que MongoDB réponde avant de démarrer.
- **backend** : image construite depuis `backend/Dockerfile` (Node 20). `MONGO_URI` pointe vers le service `mongo`, pas vers `localhost`.
- **frontend** : image construite depuis `frontend/Dockerfile` (build React, puis Nginx). Nginx sert l'interface sur le port 80 du conteneur, publié en `3000`, et relaie `/api` vers le backend.

Le secret JWT n'est pas copié dans l'image. Pour le définir, créez un fichier `.env` à la racine avant le démarrage :

```
JWT_SECRET=un-secret-long-et-aleatoire
```

Sans ce fichier, Compose utilise la valeur de repli `change-me-in-production`.

Commandes utiles :

```bash
docker compose ps
docker compose logs -f backend
docker compose down
```

`docker compose down` arrête les conteneurs. Le volume `mongo_data` est conservé. Ajoutez `-v` pour supprimer aussi les données.

### b. Lancement local (sans Docker)

Prérequis : Node.js et un MongoDB démarré sur le port 27017.

Le backend lit `backend/.env` :

```
MONGO_URI=mongodb://localhost:27017/exam_practice_db
JWT_SECRET=secretkey123
```

Cette URI `localhost` ne convient qu'à ce mode. Dans un conteneur, `localhost` désigne le conteneur lui-même.

Backend :

```bash
cd backend
npm install
npm start
```

Frontend, dans un autre terminal :

```bash
cd frontend
npm install
npm start
```

Sans variable `REACT_APP_API_URL`, le frontend appelle `http://localhost:5000/api`. Dans l'image Docker, cette variable vaut `/api`.

---

## 2. Mission pour les Étudiants

Votre objectif est d'analyser, corriger et améliorer cette application pour la rendre prête pour une mise en production, en suivant les compétences de votre référentiel.

### ✓ E27 – Détection des bugs et mesures correctives

Le code contient plusieurs bugs fonctionnels et d'interface.

**Pistes de réflexion :**
- Testez l'application : créez un compte, connectez-vous, ajoutez, modifiez et supprimez des tâches.
- Que se passe-t-il si vous soumettez des formulaires vides ?
- La mise à jour de l'interface est-elle toujours immédiate après une action ?
- Le feedback utilisateur en cas d'erreur (ex: mauvais login) est-il suffisant ?
- Autres ....
- **Action :** Identifiez au moins 3 bugs, décrivez-les, et proposez une correction dans le code.

### ✓ E28 – Détection des failles de sécurité et mesures correctives

L'application présente plusieurs vulnérabilités.

**Pistes de réflexion :**
- **Validation des entrées** : Que se passe-t-il si vous entrez du code HTML ou JavaScript (`<script>alert('test')</script>`) dans les formulaires ? (Faille XSS)
- **Contrôle d'accès** : Un utilisateur peut-il voir ou modifier les données d'un autre utilisateur ? (Faille IDOR - Insecure Direct Object Reference). Regardez les routes `PUT` et `DELETE` dans `backend/routes/tasks.js`.
- **Gestion des secrets** : Le secret `JWT_SECRET` dans le fichier `.env` est-il robuste ? Comment devrait-il être géré en production ?
- **Dépendances** : Les dépendances du projet (`package.json`) sont-elles à jour ? Utilisez `npm audit` pour vérifier.
- **Configuration** : La configuration CORS dans `backend/server.js` est-elle trop permissive pour une production ?
- Autres ....
- **Action :** Identifiez au moins 2 failles de sécurité, expliquez le risque associé et corrigez-les.

### ✓ E29 – Génération de la documentation et journal des évolutions

Le code n'est pas documenté et il n'y a pas de suivi des changements.

**Pistes de réflexion :**
- **Documentation du code source** : Comment pourriez-vous documenter les fonctions, les routes de l'API et les composants React ? Des outils comme **JSDoc** (`/** ... */`) pour le backend JavaScript et les commentaires standards pour React peuvent être utilisés.
- **Journal des évolutions (Changelog)** : Vous allez apporter des modifications. Comment les tracer ? Créez un fichier `CHANGELOG.md` à la racine du projet et documentez-y chaque bug et faille de sécurité que vous corrigez.
- **Action :**
    1.  Documentez au moins une route de l'API backend et un composant React frontend en utilisant les commentaires de documentation (précisez ce qui a été fait).
    2.  Créez et maintenez un `CHANGELOG.md`.

### ✓ E21 à E26 – Déploiement, CI/CD, Monitoring

Ces points concernent l'infrastructure et l'automatisation.

**Pistes de réflexion :**
- **Conteneurisation (E24)** : en place. `backend/Dockerfile` et `frontend/Dockerfile` construisent les deux applications. `docker-compose.yml` orchestre ces services avec MongoDB. Le détail du lancement est dans la section 1.
- **CI/CD (E24)** : Comment automatiser le déploiement ? Écrivez un petit script `deploy.sh` ou décrivez les étapes d'un pipeline (ex: GitHub Actions, GitLab CI) qui pourrait :
    1.  Installer les dépendances.
    2.  Lancer les tests (que vous pourriez écrire !).
    3.  Construire les images Docker.
    4.  Pousser les images vers un registre (Docker Hub, etc.).
- **Journalisation (Logging) (E25)** : Les `console.log` actuels sont-ils suffisants ? Proposez une solution de logging plus robuste (ex: Winston, Pino) pour le backend, qui pourrait logger dans des fichiers ou envoyer les logs vers un service centralisé.
- **Monitoring et alertes (E26)** : Comment surveiller que l'application est en bonne santé ? Proposez des outils (ex. : Prometheus, Grafana, Uptime Kuma) et définissez 2 ou 3 alertes pertinentes (ex. : « API indisponible », « latence > 500 ms », « taux d'erreur > 5 % »). Vous pouvez aussi décrire les solutions proposées par l'hébergeur choisi.

- **Hébergement, DNS, Sécurité (E21, E22, E23)** : Décrivez une architecture cible sur un fournisseur cloud (ex: AWS, Azure, GCP, Scaleway...). Où hébergeriez-vous les conteneurs ? La base de données ? Comment configureriez-vous le nom de domaine et le certificat HTTPS ?

---

Bon courage !
