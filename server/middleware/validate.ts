import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodSchema } from "zod";

interface ValidateOptions {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/**
 * Express middleware that validates request body / params / query against
 * the given Zod schemas. On failure, responds with 400 and the formatted
 * issue tree so callers can see exactly what was wrong.
 */
export function validate(options: ValidateOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (options.body) {
      const result = options.body.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: "Invalid request body",
          issues: result.error.issues,
        });
        return;
      }
      req.body = result.data;
    }
    if (options.params) {
      const result = options.params.safeParse(req.params);
      if (!result.success) {
        res.status(400).json({
          error: "Invalid path parameters",
          issues: result.error.issues,
        });
        return;
      }
      // params is read-only on Express types; mutate via Object.assign
      Object.assign(req.params, result.data);
    }
    if (options.query) {
      const result = options.query.safeParse(req.query);
      if (!result.success) {
        res.status(400).json({
          error: "Invalid query parameters",
          issues: result.error.issues,
        });
        return;
      }
      Object.assign(req.query, result.data);
    }
    next();
  };
}
