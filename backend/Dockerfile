FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/
COPY tests/ ./tests/

EXPOSE 5000

CMD ["node", "src/server.js"]
