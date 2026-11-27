#!/usr/bin/env bash
# Déploie la stack pré-production ou production à partir des images déjà publiées.
# Usage : placer ce script à côté de docker-compose.yml et d'un fichier .env, puis
#         bash deploy.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

ENVIRONMENT="${ENVIRONMENT:-preproduction}"
case "$ENVIRONMENT" in
  preproduction|preprod)
    ENVIRONMENT=preproduction
    HTTP_PORT="${HTTP_PORT:-8080}"
    ;;
  production|prod)
    ENVIRONMENT=production
    HTTP_PORT="${HTTP_PORT:-80}"
    ;;
  *)
    echo "ENVIRONMENT doit valoir preproduction ou production (reçu : ${ENVIRONMENT})" >&2
    exit 1
    ;;
esac

: "${BACKEND_IMAGE:?BACKEND_IMAGE est obligatoire}"
: "${FRONTEND_IMAGE:?FRONTEND_IMAGE est obligatoire}"
: "${JWT_SECRET:?JWT_SECRET est obligatoire}"
: "${CORS_ORIGIN:?CORS_ORIGIN est obligatoire}"

if [ "${#JWT_SECRET}" -lt 32 ]; then
  echo "JWT_SECRET doit contenir au moins 32 caractères" >&2
  exit 1
fi

export ENVIRONMENT HTTP_PORT BACKEND_IMAGE FRONTEND_IMAGE JWT_SECRET CORS_ORIGIN
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-tasks-${ENVIRONMENT}}"

if [ -n "${GHCR_PULL_TOKEN:-}" ]; then
  : "${GHCR_USER:?GHCR_USER est obligatoire pour se connecter au registre}"
  printf '%s' "$GHCR_PULL_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
fi

echo "Déploiement ${ENVIRONMENT} (${COMPOSE_PROJECT_NAME}) sur le port ${HTTP_PORT}"
echo "Backend  : ${BACKEND_IMAGE}"
echo "Frontend : ${FRONTEND_IMAGE}"

docker compose -f docker-compose.yml pull
docker compose -f docker-compose.yml up -d --remove-orphans

health_url="http://127.0.0.1:${HTTP_PORT}/api/health"
echo "Contrôle de santé : ${health_url}"

fetch_health() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "$health_url"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- "$health_url"
  else
    echo "curl ou wget est requis sur le serveur pour le contrôle de santé" >&2
    return 1
  fi
}

if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
  echo "curl ou wget est requis sur le serveur pour le contrôle de santé" >&2
  exit 1
fi

ok=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
  body="$(fetch_health 2>/dev/null || true)"
  case "$body" in
    *'"status":"ok"'*)
      ok=1
      break
      ;;
  esac
  sleep 2
done

if [ "$ok" -ne 1 ]; then
  echo "Le contrôle de santé a échoué pour ${ENVIRONMENT}" >&2
  docker compose -f docker-compose.yml ps || true
  docker compose -f docker-compose.yml logs --tail=80 || true
  exit 1
fi

echo "Déploiement ${ENVIRONMENT} réussi"
