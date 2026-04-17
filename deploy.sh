#!/bin/bash
set -e

echo "=== Autonoma Self-Hosted Deploy ==="

# ─── 1. Ensure pnpm is available (no sudo required) ────────────────────────
export PNPM_HOME="${HOME}/.local/share/pnpm"
export PATH="${PNPM_HOME}:${PATH}"

if ! command -v pnpm &>/dev/null; then
  echo "Installing pnpm..."
  curl -fsSL https://get.pnpm.io/install.sh | env PNPM_HOME="${PNPM_HOME}" sh -
  export PATH="${PNPM_HOME}:${PATH}"
fi

echo "Node: $(node -v) | pnpm: $(pnpm -v)"

# ─── 3. Install dependencies ─────────────────────────────────────────────────
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# ─── 4. Build API and UI (with all their workspace dependencies) ─────────────
echo "Building API and UI..."
pnpm turbo run build --filter=@autonoma/api... --filter=@autonoma/ui...

# ─── 5. Prepare pruned build contexts for Docker ────────────────────────────
echo "Preparing Docker build contexts..."

# API
rm -rf pruned/api
mkdir -p pruned/api
cp apps/api/Dockerfile pruned/api/Dockerfile
cp -r apps/api/dist pruned/api/dist

# UI
rm -rf pruned/ui
mkdir -p pruned/ui
cp apps/ui/Dockerfile pruned/ui/Dockerfile
cp apps/ui/nginx.conf.template pruned/ui/nginx.conf.template
cp -r apps/ui/dist pruned/ui/dist

# ─── 6. Build Docker images ──────────────────────────────────────────────────
echo "Building Docker images..."
docker compose -f docker-compose.prod.yaml build

# ─── 7. Start PostgreSQL and Redis first ────────────────────────────────────
echo "Starting database and cache..."
docker compose -f docker-compose.prod.yaml up -d postgresql redis

echo "Waiting for PostgreSQL to be ready..."
until docker compose -f docker-compose.prod.yaml exec postgresql pg_isready -U postgres -d autonoma &>/dev/null; do
  sleep 2
done
echo "PostgreSQL is ready."

# ─── 8. Run database migrations ─────────────────────────────────────────────
echo "Running database migrations..."
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/autonoma" \
  pnpm --filter @autonoma/db exec prisma migrate deploy

# ─── 9. Start all services ──────────────────────────────────────────────────
echo "Starting all services..."
docker compose -f docker-compose.prod.yaml up -d

echo ""
echo "=== Deploy complete! ==="
echo "UI running at: http://localhost:3000"
echo "Configure Ploi nginx to proxy autonoma.scalater.com -> localhost:3000"
