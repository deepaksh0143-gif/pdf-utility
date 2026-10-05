# Production image for the PDF utility (Next.js standalone output).
# Build:  docker build -t pdf-utility .
# Run:    docker run -p 3000:3000 pdf-utility

# ---- Build stage ------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies with the locked tree (postinstall copies the pdf.js
# worker into public/). No secrets are needed at build time.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runtime stage ----------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Non-root user (defense in depth; the app never needs privileges).
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Standalone server + the static assets it serves.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Temporary job files go to the OS temp dir inside the container
# (TMP_DIR can override). They are deleted within one hour by the sweeper.
CMD ["node", "server.js"]
