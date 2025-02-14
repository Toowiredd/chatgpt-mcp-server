FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies without running prepare script
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Install TypeScript globally
RUN npm install -g typescript@5.3.3

# Build TypeScript code
RUN npm run build

# Expose the port from .env (default 3001)
EXPOSE 3001

# Run the server
CMD ["node", "build/index.js"]