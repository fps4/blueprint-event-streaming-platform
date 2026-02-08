import { Router } from 'express';
import { buildLogsRouter } from './logs.js';

export function buildRouter(): Router {
  const router = Router();

  router.use('/logs', buildLogsRouter());

  // Placeholder for future routes
  // router.use('/metrics', buildMetricsRouter());
  // router.use('/traces', buildTracesRouter());
  // router.use('/alerts', buildAlertsRouter());

  return router;
}
