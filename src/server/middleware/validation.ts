/**
 * Validation Middleware
 *
 * Zod-based request validation middleware.
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

/**
 * Format Zod validation errors for API response
 */
function formatZodErrors(error: ZodError): { field: string; message: string }[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Middleware to validate request body
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request body',
          details: formatZodErrors(error),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Middleware to validate query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: formatZodErrors(error),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Middleware to validate route parameters
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid route parameters',
          details: formatZodErrors(error),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Generic validation middleware that validates body, query, and params
 */
export function validate<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown
>(schemas: {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  params?: ZodSchema<TParams>;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: { location: string; field: string; message: string }[] = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.push(
          ...result.error.errors.map((err) => ({
            location: 'body',
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      } else {
        req.body = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.push(
          ...result.error.errors.map((err) => ({
            location: 'query',
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      } else {
        req.query = result.data as any;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.push(
          ...result.error.errors.map((err) => ({
            location: 'params',
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      } else {
        req.params = result.data as any;
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request',
        details: errors,
      });
      return;
    }

    next();
  };
}
