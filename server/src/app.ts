import express from 'express';
import type { Db } from 'mongodb';
import { routes } from './routes.ts';
import { HttpError } from './validation.ts';

export function createApp(db: Db) {
  const app = express();
  app.use(express.json({ limit: '10kb' }));
  app.use('/api', routes(db));
  app.use('/api', (_req, res) => {
    res
      .status(404)
      .json({ error: { code: 'ROUTE_NOT_FOUND', message: 'API route was not found.' } });
  });
  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (error instanceof HttpError) {
        res.status(error.status).json({
          error: {
            code: error.code,
            message: error.message,
            ...(error.conflicts ? { conflicts: error.conflicts } : {}),
          },
        });
        return;
      }
      if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
        res.status(400).json({
          error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON.' },
        });
        return;
      }
      console.error(error instanceof Error ? error.message : 'Unexpected API error');
      res
        .status(500)
        .json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
    },
  );
  return app;
}
