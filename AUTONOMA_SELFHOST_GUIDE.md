# Autonoma Self-Hosted Setup Guide

## Estado Actual
- ✅ Servidor creado en Ploi (AWS Ohio): IP fija `3.13.58.122`
- ✅ Docker instalado en el servidor
- ✅ Fork del repositorio: `/Users/guillermofigueroamesa/projects/autonoma`
- ✅ Dominio `autonoma.scalater.com` apuntando a `3.13.58.122`
- ✅ `.env` configurado con Gemini, Google OAuth, secrets
- ✅ `docker-compose.prod.yaml` y `deploy.sh` creados
- ⏳ Pendiente: Push al servidor y ejecutar deploy

## Variables de Entorno (.env)

### Requeridas (ya configuradas)
- `DATABASE_URL`, `REDIS_URL` — apuntan a servicios Docker internos
- `BETTER_AUTH_SECRET`, `SCENARIO_ENCRYPTION_KEY` — generados
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google Cloud Console
- `GEMINI_API_KEY` — Google AI Studio

### Opcionales (dejar vacías para empezar)
- `GITHUB_APP_*` — solo si quieres integración con GitHub
- `S3_*` — solo si necesitas almacenamiento de archivos (screenshots, etc.)
- `SENTRY_*` — observabilidad/errores
- `POSTHOG_*` — analytics
- `VITE_ARGO_URL` — solo para Kubernetes/Argo Workflows (no aplica en self-host básico)
- `NAMESPACE` — solo para Kubernetes

## Google OAuth — URI de Redirección
En Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs, agregar:
```
https://autonoma.scalater.com/v1/auth/callback/google
```

## Deploy al Servidor

### 1. En tu máquina local — push del fork
```bash
git add -A && git commit -m "chore: self-hosted config" && git push
```

### 2. SSH al servidor
```bash
ssh ploi@3.13.58.122
```

### 3. Clonar el repo y copiar .env
```bash
git clone https://github.com/TU_USUARIO/autonoma.git
cd autonoma
# Copiar el .env desde tu máquina local:
# scp /Users/guillermofigueroamesa/projects/autonoma/.env ploi@3.13.58.122:~/autonoma/.env
```

### 4. Ejecutar el deploy
```bash
chmod +x deploy.sh
./deploy.sh
```

El script hace automáticamente:
1. Instala Node.js 24 + pnpm
2. `pnpm install --frozen-lockfile`
3. Build con Turbo (API + UI y dependencias)
4. Prepara carpetas `pruned/api` y `pruned/ui` para Docker
5. Construye imágenes Docker
6. Levanta PostgreSQL + Redis
7. Corre migraciones de Prisma
8. Levanta todos los servicios

### 5. Configurar Ploi nginx
En Ploi → Servidor → Sitios → Crear sitio `autonoma.scalater.com`:
- Proxy a `http://localhost:3000`
- Habilitar SSL con Let's Encrypt

O en la config nginx de Ploi:
```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Arquitectura de Producción
```
Internet
  → Ploi nginx (SSL :443) → autonoma.scalater.com
      → UI container (:3000)
          → /v1/*    → API container (:4000) → PostgreSQL + Redis
          → /*       → SPA (React)
```

## Comandos Útiles en el Servidor
```bash
# Ver logs
docker compose -f docker-compose.prod.yaml logs -f

# Redeploy después de cambios
./deploy.sh

# Reiniciar un servicio
docker compose -f docker-compose.prod.yaml restart api

# Ver estado de servicios
docker compose -f docker-compose.prod.yaml ps
```

## Conexión con telehealth-saas
Una vez Autonoma esté corriendo:
- URL del Environment Factory: `https://back-stg.joincloudhealth.com/api/autonoma`
- Signing Secret: `226b0d312953af6446efe112198cc4b79b3a37f3383a481cba228b75ec5103a9`
- Project ID: `cmo21bynz001501acqwn4gn4c`

## Servidor Ploi
- IP: `3.13.58.122`
- Nombre: `autonoma`
- Región: AWS us-east-2 (Ohio)
