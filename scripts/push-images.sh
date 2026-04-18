#!/bin/bash
set -e

# ─── Config ──────────────────────────────────────────────────────────────────
REGISTRY="ghcr.io"
OWNER="scalater"
TAG="${1:-latest}"

API_IMAGE="${REGISTRY}/${OWNER}/autonoma-api:${TAG}"
UI_IMAGE="${REGISTRY}/${OWNER}/autonoma-ui:${TAG}"
MIGRATE_IMAGE="${REGISTRY}/${OWNER}/autonoma-migrate:${TAG}"

echo "=== Building and pushing images to GHCR ==="
echo "API:     ${API_IMAGE}"
echo "UI:      ${UI_IMAGE}"
echo "Migrate: ${MIGRATE_IMAGE}"
echo ""

# ─── Check Docker is running ──────────────────────────────────────────────────
if ! docker info &>/dev/null; then
  echo "ERROR: Docker is not running. Start Docker Desktop and try again."
  exit 1
fi

# ─── Install pnpm if needed ──────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  echo "Installing pnpm..."
  corepack enable
  corepack prepare pnpm@10.33.0 --activate
fi

# ─── Install dependencies ────────────────────────────────────────────────────
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# ─── Build API and UI ────────────────────────────────────────────────────────
echo "Building API and UI..."
pnpm turbo run build --filter=@autonoma/api... --filter=@autonoma/ui...

# ─── Prepare Docker build contexts ──────────────────────────────────────────
echo "Preparing build contexts..."

rm -rf pruned/api pruned/ui
mkdir -p pruned/api pruned/ui

# API
cp apps/api/Dockerfile pruned/api/Dockerfile
cp -r apps/api/dist    pruned/api/dist

# UI
cp apps/ui/Dockerfile              pruned/ui/Dockerfile
cp apps/ui/nginx.conf.template     pruned/ui/nginx.conf.template
cp -r apps/ui/dist                 pruned/ui/dist

# ─── Login to GHCR ──────────────────────────────────────────────────────────
echo ""
echo "Logging in to GHCR..."
echo "You need a GitHub Personal Access Token with 'write:packages' scope."
echo "Create one at: https://github.com/settings/tokens/new"
echo ""
read -rsp "GitHub Token: " GITHUB_TOKEN
echo ""
echo "${GITHUB_TOKEN}" | docker login ghcr.io -u "${OWNER}" --password-stdin

# ─── Build and push images ───────────────────────────────────────────────────
echo "Building API image..."
docker build --platform linux/amd64 -t "${API_IMAGE}" pruned/api/
docker push "${API_IMAGE}"

echo "Building UI image..."
docker build --platform linux/amd64 -t "${UI_IMAGE}" pruned/ui/
docker push "${UI_IMAGE}"

echo "Building Migrate image..."
docker build --platform linux/amd64 -t "${MIGRATE_IMAGE}" packages/db/
docker push "${MIGRATE_IMAGE}"

echo ""
echo "=== Done! Images pushed to GHCR ==="
echo ""
echo "Make the packages public (if not already):"
echo "  https://github.com/orgs/scalater/packages"
echo ""
echo "Next: update Ploi's docker-compose and click 'Compose up'"
