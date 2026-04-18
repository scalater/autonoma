FROM node:24-alpine
WORKDIR /app

# Install packages needed for prisma.config.ts (Prisma v7)
RUN npm init -y && \
    npm install prisma@7 tsx @t3-oss/env-core zod

# Copy prisma config (needs tsx + env validation)
COPY prisma.config.ts ./
COPY src/env.ts ./src/env.ts
COPY prisma/ ./prisma/

CMD ["npx", "prisma", "migrate", "deploy"]
