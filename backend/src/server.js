import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import yaml from 'yamljs';
import swaggerUi from 'swagger-ui-express';
import db from './repositories/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (development/diagnostics)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Swagger UI - SH-11 (T011)
let swaggerDocument = null;
const openApiPaths = [
  path.join(__dirname, 'contracts', 'openapi.yaml'),
  path.join(__dirname, '..', '..', 'specs', '001-hotel-management', 'contracts', 'openapi.yaml')
];

for (const p of openApiPaths) {
  if (fs.existsSync(p)) {
    try {
      swaggerDocument = yaml.load(p);
      break;
    } catch (e) {
      console.warn(`Kunne ikke parse OpenAPI fra ${p}:`, e.message);
    }
  }
}

if (swaggerDocument) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('Swagger UI monteret på /api-docs');
} else {
  console.warn('Advarsel: openapi.yaml blev ikke fundet for /api-docs');
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT 1 AS alive');
    res.json({
      status: 'UP',
      database: result && result[0]?.alive === 1 ? 'CONNECTED' : 'UNKNOWN',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'DEGRADED',
      database: 'DISCONNECTED',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root ping
app.get('/', (req, res) => {
  res.json({
    message: 'Hotel Kong Arthur API is running',
    docs: '/api-docs',
    health: '/api/health'
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Ruten ${req.method} ${req.url} findes ikke`,
      code: 'NOT_FOUND'
    }
  });
});

// Centraliseret fejlhåndterings-middleware - SH-10 (T010)
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Der opstod en intern serverfejl',
      code: err.code || 'INTERNAL_SERVER_ERROR'
    }
  });
});

// Start server hvis filen køres direkte
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Hotel Kong Arthur REST API lytter på port ${PORT}`);
    console.log(`API dokumentation tilgængelig på http://localhost:${PORT}/api-docs`);
  });
}

export default app;
