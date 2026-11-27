# Déploiement automatisé

Deux branches portent deux environnements Render. GitHub Actions vérifie le commit. Render déploie ensuite, sans secret supplémentaire dans le dépôt.

| Branche | Environnement Render | Rôle |
|---|---|---|
| `pre-production` | `qualification` | Valider un correctif avant de le promouvoir |
| `production` | `production` | Version servie aux utilisateurs |

Le fichier du pipeline est `.github/workflows/ci-cd.yml`. Il démarre sur une pull request ou une poussée vers l'une de ces branches.

## Étapes

```
pull request ou poussée
        |
        v
Tests API --------+
  npm ci          |
  node --test     |
  npm audit       |
                  +----> les deux doivent réussir
Tests interface --+
  npm ci
  Jest
  npm run build
        |
        v
Images Docker
  backend/Dockerfile
  frontend/Dockerfile
        |
        +-- poussée sur la branche : publication GHCR
        |     :pre-production ou :production, et :<sha>
        |
        v
Render (checksPass)
  seulement les services dont backend/** ou frontend/** a changé
```

Une pull request construit les images sans les publier et ne déploie rien : Render ne suit pas la branche de la pull request. La fusion pousse la branche suivie, relance le pipeline, puis Render déploie si tout est vert.

Le pipeline tourne à chaque poussée, y compris un commit qui ne touche que la documentation. Un commit sans vérification ne serait jamais déployé avec `checksPass`.

## Registre et hébergement

Les images publiées sont :

```
ghcr.io/<propriétaire>/exam-practice-api:pre-production
ghcr.io/<propriétaire>/exam-practice-api:production
ghcr.io/<propriétaire>/exam-practice-api:<sha>
```

Le même schéma vaut pour `exam-practice-web`. Le jeton `GITHUB_TOKEN` du dépôt suffit : aucun mot de passe de registre n'est à créer. Le paquet GHCR reprend la visibilité du dépôt à la première publication.

Render ne tire pas ces images. L'API est un service Node et le site est statique, comme décrit dans `docs/hebergement-render.md`. Render reconstruit ce commit depuis Git une fois le pipeline vert. L'image du registre est l'artefact Docker reproductible du même commit. L'interface publiée sur GHCR est celle de Nginx, avec `REACT_APP_API_URL=/api`, identique à Docker Compose. Le site Render, lui, reçoit l'URL publique de l'API au moment de son build.

## Promotion

1. Ouvrir une pull request vers `pre-production`. Le pipeline doit être vert.
2. Fusionner. Render déploie la qualification.
3. Vérifier le site et `GET /api/health` (`{"status":"ok","db":"up"}`).
4. Ouvrir une pull request de `pre-production` vers `production`.
5. Fusionner. Render déploie la production.

Protéger la branche `production` dans GitHub (pull request obligatoire, vérifications `CI/CD / Tests API`, `CI/CD / Tests interface` et `CI/CD / Images Docker` exigées) ajoute une relecture humaine. Le pipeline n'a pas d'autre secret à configurer.

L'audit npm du frontend n'est pas une porte : il reste les alertes connues de `react-scripts`, notées dans le journal. L'audit du backend, lui, fait échouer le pipeline.

## Ce qui bloque un déploiement

| Cause | Effet |
|---|---|
| Test, audit backend ou build en échec | Render ne déploie pas |
| Fichiers hors `backend/**` et `frontend/**` | Pipeline vert, Render ne reconstruit pas le service concerné |
| Branche sans le fichier de workflow | Aucune vérification : Render ne déploie pas |
| `MONGODB_URI` absent sur l'API | Le service Render démarre puis échoue au health check |
