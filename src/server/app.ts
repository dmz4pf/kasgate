/**
 * Express Application Setup
 *
 * Configures middleware and routes for the KasGate API.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { notFoundHandler, errorHandler } from './middleware/error.js';

// Import routes
import healthRoutes from './routes/health.js';
import sessionRoutes from './routes/sessions.js';
import merchantRoutes from './routes/merchants.js';

/**
 * Create and configure the Express application
 */
export function createApp(): express.Application {
  const app = express();

  // ============================================================
  // MIDDLEWARE
  // ============================================================

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for widget embedding
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS - allow all origins for widget
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  }));

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging (simple)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[KasGate] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
  });

  // ============================================================
  // STATIC FILES
  // ============================================================

  // Serve widget bundle
  app.use('/widget', express.static('dist'));

  // Serve dashboard (if exists)
  app.use('/dashboard', express.static('dist/dashboard'));

  // ============================================================
  // API ROUTES
  // ============================================================

  // Health checks
  app.use('/health', healthRoutes);

  // API v1
  app.use('/api/v1/sessions', sessionRoutes);
  app.use('/api/v1/merchants', merchantRoutes);

  // ============================================================
  // ERROR HANDLING
  // ============================================================

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
