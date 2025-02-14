FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose the port from .env (default 3001)
EXPOSE 3001

# Run the server
CMD ["node", "build/index.js"]