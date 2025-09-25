# WebSocket Voice Server Dockerfile for Fly.io
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --prod

# Copy server files
COPY live-server.ts ./

# Install tsx for TypeScript execution
RUN pnpm add tsx

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Use PORT from environment (Fly.io provides this)
ENV PORT=8080
EXPOSE 8080

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:' + (process.env.PORT || 8080) + '/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start server with PORT environment variable
CMD ["sh", "-c", "LIVE_SERVER_PORT=$PORT pnpm tsx live-server.ts"]