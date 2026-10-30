import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets (e.g. Tableau WDC)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Basic health route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Hotel Kong Arthur Management API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Intern serverfejl',
      code: err.code || 'INTERNAL_SERVER_ERROR'
    }
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hotel Kong Arthur Backend running on port ${PORT}`);
  });
}

export default app;
