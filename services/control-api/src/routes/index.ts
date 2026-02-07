import type { ErrorRequestHandler } from 'express';
import { Router } from 'express';
import { healthRoutes } from './health.js';
import { topicRoutes } from './topics.js';
import { workspaceRoutes } from './workspaces.js';
import { clientRoutes } from './clients.js';
import { connectionRoutes } from './connections.js';
import { userRoutes } from './users.js';
import { jsonataTransformRoutes } from './jsonataTransforms.js';
import { pipelineRoutes } from './pipelines.js';
import { log } from './helpers.js';

export function buildRouter() {
  const router = Router();

  router.use(healthRoutes());
  router.use(topicRoutes());
  router.use(workspaceRoutes());
  router.use(clientRoutes());
  router.use(connectionRoutes());
  router.use(userRoutes());
  router.use(jsonataTransformRoutes());
  router.use(pipelineRoutes());

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    log.error({ err }, 'unhandled error');
    res.status(500).json({ error: 'internal error' });
  };

  router.use(errorHandler);

  return router;
}
