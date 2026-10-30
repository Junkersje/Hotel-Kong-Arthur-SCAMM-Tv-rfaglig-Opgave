import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets (Tableau WDC m.m.)
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use('/public', express.static(publicDir));
  app.use(express.static(publicDir)); // Allow direct /tableau-wdc.html access
}

// Swagger UI & OpenAPI Specification Setup
const candidateSpecPaths = [
  process.env.OPENAPI_SPEC_PATH,
  path.join(__dirname, '../../specs/001-hotel-management/contracts/openapi.yaml'),
  path.join(__dirname, '../specs/openapi.yaml'),
  '/app/specs/openapi.yaml'
].filter(Boolean);

let swaggerDoc = null;
for (const p of candidateSpecPaths) {
  if (fs.existsSync(p)) {
    try {
      swaggerDoc = YAML.load(p);
      console.log(`Loaded OpenAPI specification from: ${p}`);
      break;
    } catch (e) {
      console.warn(`Could not parse OpenAPI YAML at ${p}:`, e.message);
    }
  }
}

if (swaggerDoc) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
    customSiteTitle: 'Hotel Kong Arthur API Documentation',
    customCss: '.swagger-ui .topbar { display: none }'
  }));

  app.get('/api-docs.json', (req, res) => {
    res.json(swaggerDoc);
  });
} else {
  console.warn('OpenAPI contract not found at any candidate path. Swagger UI disabled.');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Hotel Kong Arthur Management API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Import & mount REST API routes
import bookingRoutes from './routes/bookingRoutes.js';
app.use('/api', bookingRoutes);

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Intern serverfejl',
      code: err.code || 'INTERNAL_SERVER_ERROR',
      details: err.details || null
    }
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hotel Kong Arthur Backend listening at http://localhost:${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
  });
}

export default app;
