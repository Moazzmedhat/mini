FROM node:22-alpine

WORKDIR /app

# Copy package descriptors
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm install

# Copy full source
COPY . .

# Build shared, server, and client bundles
RUN npm run build

# Expose server port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV CORS_ORIGIN=*

# Run production unified server (serves both WebSockets and client static files)
CMD ["npm", "start"]
