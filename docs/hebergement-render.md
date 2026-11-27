# Hébergement de qualification sur Render

L'application est une liste de tâches : une interface React, une API Express et une base MongoDB. L'environnement de qualification (pré-production) sert à valider un correctif avant la production. Il doit ressembler à la cible, rester peu coûteux, et se déployer à partir de la branche `pre-production`.

## Choix retenu

**Render** pour l'interface et l'API, **MongoDB Atlas** (offre M0, région AWS `eu-central-1`, Francfort) pour les données.

Render publie le frontend comme site statique et l'API comme service web Node.js. Atlas héberge MongoDB, que Render ne propose pas. Les deux services sont dans la région Francfort, la plus proche des utilisateurs visés parmi les régions Render.

## Pourquoi cette combinaison

| Besoin | Réponse |
|---|---|
| Deux composants déjà séparés (React et Express) | Un site statique et un service web, décrits ensemble dans `render.yaml` |
| MongoDB et Mongoose déjà en place | Atlas parle le même protocole. Aucune réécriture de la persistance |
| Branche `pre-production` distincte de la future production | Chaque service du Blueprint est fixé sur cette branche |
| HTTPS et nom d'accès | Certificat géré par Render sur `*.onrender.com` |
| Secret JWT hors du dépôt | `JWT_SECRET` est généré par Render. `MONGO_URI` est saisi dans le tableau de bord |
| Contrôle de santé | `GET /api/health` vérifie l'API et MongoDB |
| Journaux | Winston écrit en JSON sur la sortie standard. Render les conserve. Les fichiers locaux sont coupés (`LOG_TO_FILE=false`) car le disque du service est éphémère |

Le plan `free` de l'API (0,1 CPU, 512 Mo) et le site statique gratuit suffisent pour une qualification : peu d'utilisateurs, pas d'engagement de disponibilité. Le site statique est servi par le CDN de Render. L'API s'endort après une période sans trafic. Le premier appel suivant prend alors environ une minute. C'est acceptable pour valider un correctif, pas pour des utilisateurs réels.

## Options écartées

**Une machine virtuelle (AWS EC2, Azure VM, Scaleway Instance) avec Docker Compose.** Le dépôt sait déjà construire les trois conteneurs. Sur une VM, il faudrait en plus ouvrir les ports, renouveler le certificat, surveiller le disque et redémarrer les conteneurs. Ce travail d'exploitation dépasse le besoin d'un environnement de qualification.

**Un cluster Kubernetes (EKS, AKS, Scaleway Kapsule).** Utile quand plusieurs équipes déploient beaucoup de services. Ici il y a deux processus et une base. Le cluster coûterait plus cher que l'application et ajouterait une couche à opérer.

**Tout héberger chez AWS (ECS et DocumentDB, ou App Runner et Atlas).** Cohérent pour une production plus tard, trop lourd pour qualifier cette application : plus de services à configurer, facturation plus difficile à prévoir, et DocumentDB n'est pas un MongoDB identique.

**Render Postgres à la place de MongoDB.** Render sait créer Postgres dans le Blueprint. L'application est écrite pour MongoDB (Mongoose, filtres, modèles). Changer de moteur pour coller à l'hébergeur n'apporte rien à la qualification.

**Railway ou Fly.io.** Le déploiement depuis Git est comparable. Render est retenu pour le Blueprint (l'infrastructure est dans le dépôt), les environnements nommés, la région Francfort et le site statique gratuit avec en-têtes HTTP.

## Architecture de qualification

```
Navigateur
    |  HTTPS
    v
exam-practice-web  (site statique, branche pre-production)
    |
    |  HTTPS, autre origine, CORS limité à l'URL du site
    v
exam-practice-api  (Node 20, plan free, Francfort)
    |
    |  TLS, mongodb+srv
    v
MongoDB Atlas M0   (base exam_practice_preprod, eu-central-1)
```

Le site statique ne proxifie pas l'API : ce ne sont que des fichiers. Le navigateur appelle l'URL publique de l'API. Le Blueprint relie les deux adresses sans les écrire en dur :

- `REACT_APP_API_URL` reçoit `RENDER_EXTERNAL_URL` de l'API. Le client ajoute `/api` si le chemin n'y est pas déjà.
- `CORS_ORIGIN` reçoit l'URL publique du site. Toute autre origine est refusée.

Le réseau privé de l'environnement `qualification` est isolé. L'API n'a pas à joindre un autre service Render : Atlas est atteint par l'Internet public. L'isolation empêche un futur environnement de production d'entrer sur ce réseau privé.

Les en-têtes du site reprennent ceux de Nginx (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, Content-Security-Policy). `connect-src` autorise `https://*.onrender.com`, car l'API n'est pas sur la même origine. Les routes du client (`/login`, `/register`, `/tasks`) sont renvoyées vers `index.html`.

## Données et secrets

La base Atlas de qualification s'appelle `exam_practice_preprod`. Elle ne sert pas au développement local ni à la future production.

Sur Render, coller la variable `MONGODB_URI` exactement comme Atlas la génère, sans ajouter le nom de la base :

```
mongodb+srv://<utilisateur>:<mot-de-passe>@<cluster>.mongodb.net
```

Le Blueprint fixe `MONGO_DB_NAME` à `exam_practice_preprod`. Au démarrage, l'API complète l'URI. `MONGODB_USERNAME` et `MONGODB_PASSWORD` ne sont utiles que si l'URI n'a pas déjà d'identifiants. En local et avec Docker, `MONGO_URI` continue de primer et n'est pas modifiée quand elle contient déjà un nom de base.

Le plan gratuit de Render n'a pas d'adresse IP de sortie fixe. Atlas doit donc autoriser `0.0.0.0/0` pour cette qualification. Le compte Atlas n'a que les droits sur cette base. Le mot de passe n'est pas commité : Render le demande au moment de la création (`sync: false`).

`JWT_SECRET` est produit par Render (256 bits). Le serveur refuse un secret de moins de 32 caractères ou une valeur connue.

## DNS et HTTPS

En qualification, le nom `*.onrender.com` suffit. Render termine TLS. Aucun certificat à déposer.

Pour un nom propre plus tard :

1. Créer un enregistrement `CNAME` du sous-domaine vers l'hôte `onrender.com` indiqué par Render.
2. Ajouter ce domaine dans le Blueprint (`domains`).
3. Laisser Render émettre le certificat.

La production aurait son propre nom (`app.exemple.fr`, `api.exemple.fr`) et n'utiliserait pas les URL de qualification.

## Surveillance utile en qualification

| Signal | Où le voir | Seuil qui mérite une action |
|---|---|---|
| API indisponible | Échec du health check Render, `GET /api/health` en 503 | Deux échecs de suite |
| MongoDB injoignable | Journal `mongodb_connection_failed`, health check `db: down` | Dès le premier échec au démarrage |
| Erreurs serveur | Journaux Render, niveau `error` | Plus de 5 % des requêtes sur 15 minutes |
| Lenteur au réveil | Première requête après veille | Attendu sur le plan gratuit. En production, passer sur un plan qui ne s'endort pas |

## Ce qui changerait en production

La production reprendrait le même Blueprint dans un environnement `production`, branche `production`, avec une autre base Atlas.

- Plan d'API au moins `0.5c-512mb`, sans mise en veille.
- Adresses IP de sortie fixes, liste Atlas limitée à ces adresses. Retirer `0.0.0.0/0`.
- Noms de domaine dédiés et `CORS_ORIGIN` limité à ces noms.
- Sauvegardes Atlas activées. La M0 ne les fournit pas.
- Secret JWT distinct de celui de qualification.

## Mise en œuvre

1. Sur Atlas, créer un cluster M0 en `eu-central-1`, un utilisateur, la base `exam_practice_preprod`, et autoriser `0.0.0.0/0`. Copier la chaîne de connexion.
2. Pousser la branche `pre-production` (elle doit contenir ce dépôt, dont `render.yaml`).

```powershell
git checkout -b pre-production
git push -u origin pre-production
```

3. Dans le tableau de bord Render : **New → Blueprint**, choisir le dépôt, puis appliquer `render.yaml`.
4. Quand Render demande `MONGODB_URI`, coller la chaîne Atlas telle quelle (`mongodb+srv://...mongodb.net`, sans nom de base).
5. Attendre que les deux services soient verts. Ouvrir l'URL du site `exam-practice-web`.
6. Créer un compte, une tâche, la modifier, la supprimer. Vérifier `https://<api>.onrender.com/api/health` : la réponse attendue est `{"status":"ok","db":"up"}`.

Si le site affiche « Impossible de contacter le serveur » au premier déploiement, relancer le déploiement du site statique : l'URL de l'API est figée dans le build React. Si l'API répond « Origine non autorisée », relancer l'API une fois l'URL du site connue.

Chaque poussée sur `pre-production` redéploie le service dont les fichiers ont changé (`backend/**` ou `frontend/**`).
