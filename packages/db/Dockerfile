FROM node:24-alpine
WORKDIR /app
RUN npm install -g prisma@7
COPY prisma/ ./prisma/
CMD ["prisma", "migrate", "deploy", "--schema", "./prisma/schema.prisma"]
