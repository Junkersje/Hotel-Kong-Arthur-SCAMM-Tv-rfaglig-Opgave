FROM node:20-alpine

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies (production only)
RUN npm install --omit=dev

# Copy application source code
COPY src/ ./src/

EXPOSE 5000

CMD ["node", "src/server.js"]
