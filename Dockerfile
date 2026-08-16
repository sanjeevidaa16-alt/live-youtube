# ==========================================
# CastLoop 24/7 RTMP Streamer Production Dockerfile
# ==========================================
FROM node:22-bullseye-slim AS base

# Install system dependencies including FFmpeg and FFprobe
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm ci

# Copy full application source code
COPY . .

# Build Vite frontend and bundle Express server into dist/server.cjs
RUN npm run build

# Create persistent data directories
RUN mkdir -p /app/data/uploads /app/data/thumbnails

# Expose HTTP port 3000 (single port architecture)
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV FFMPEG_PATH=ffmpeg
ENV FFPROBE_PATH=ffprobe

# Start standalone bundled CommonJS production server
CMD ["node", "dist/server.cjs"]
