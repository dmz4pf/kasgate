/**
 * Express Application Setup
 *
 * Configures middleware and routes for the KasGate API.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { notFoundHandler, errorHandler } from './middleware/error.js';

// Import routes
import healthRoutes from './routes/health.js';
import sessionRoutes from './routes/sessions.js';
import merchantRoutes from './routes/merchants.js';

// ============================================================
// CORS CONFIGURATION (Bug #16 fix)
// ============================================================

/**
 * Parse allowed origins from environment variable
 * Format: comma-separated list of origins (e.g., "https://example.com,https://app.example.com")
 * Set to "*" to allow all origins (not recommended for production)
 */
function getAllowedApiOrigins(): string[] | '*' {
  const origins = process.env.CORS_ALLOWED_ORIGINS;

  if (!origins || origins === '*') {
    // Default to allow all in development, but log warning
    if (process.env.NODE_ENV === 'production') {
      console.warn('[KasGate] CORS_ALLOWED_ORIGINS not set - allowing all origins. Set this in production!');
    }
    return '*';
  }

  return origins.split(',').map(o => o.trim()).filter(Boolean);
}

/**
 * CORS options for API endpoints (Bug #16: restricted origins)
 */
const apiCorsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowed = getAllowedApiOrigins();

    // Allow all origins if configured as '*'
    if (allowed === '*') {
      callback(null, true);
      return;
    }

    // Allow requests with no origin (same-origin, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check against whitelist
    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true, // Allow credentials for authenticated requests
};

/**
 * CORS options for widget/public endpoints (allow all origins for embedding)
 */
const widgetCorsOptions: cors.CorsOptions = {
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};

// ============================================================
// RATE LIMITERS (Bug #8 fix)
// ============================================================

// General rate limit: 1000 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Merchant creation: 10 requests per hour per IP (prevent spam)
const merchantCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many merchant registrations, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Session creation: 100 requests per minute per IP
const sessionCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many session requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

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

  // Body parsing with size limit (Bug #35 fix)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Apply general rate limiting (Bug #8 fix)
  app.use(generalLimiter);

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
  // STATIC FILES (Bug #16: Widget CORS - allow all origins)
  // ============================================================

  // Serve widget bundle - allow embedding from any origin
  app.use('/widget', cors(widgetCorsOptions), express.static('dist'));

  // Serve dashboard (if exists) - allow embedding from any origin
  app.use('/dashboard', cors(widgetCorsOptions), express.static('dist/dashboard'));

  // SPA fallback for dashboard client-side routing
  app.get('/dashboard/*', cors(widgetCorsOptions), (_req, res) => {
    res.sendFile('index.html', { root: 'dist/dashboard' });
  });

  // ============================================================
  // API ROUTES (Bug #16: Restricted CORS)
  // ============================================================

  // Health checks - use widget CORS (public endpoint)
  app.use('/health', cors(widgetCorsOptions), healthRoutes);

  // API v1 with rate limiting (Bug #8 fix) and restricted CORS (Bug #16 fix)
  app.use('/api/v1/sessions', cors(apiCorsOptions), sessionCreationLimiter, sessionRoutes);
  app.use('/api/v1/merchants', cors(apiCorsOptions), merchantCreationLimiter, merchantRoutes);

  // ============================================================
  // ERROR HANDLING
  // ============================================================

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
