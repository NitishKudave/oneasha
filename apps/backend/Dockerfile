FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy dependency files first
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm ci

# Generate Prisma client AFTER install
RUN npx prisma generate

# Copy the rest of the application code
COPY src ./src/

EXPOSE 4000

# Push schema to DB and start server
CMD npx prisma db push && node src/index.js
