import { Router, Request, Response } from 'express';
import { LokiClient } from '../lib/loki-client.js';
import { CONFIG } from '../config/index.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';
import { componentLogger } from '../lib/logger.js';

const log = componentLogger('logs-route');
const lokiClient = new LokiClient(CONFIG.lokiUrl);

export function buildLogsRouter(): Router {
  const router = Router();

  router.get('/', requireAuth(), requireWorkspace(), async (req: Request, res: Response) => {
    try {
      const {
        service,
        level,
        requestId,
        topic,
        since,
        until,
        limit = '100'
      } = req.query;

      const workspaceId = req.workspaceId;

      // Build LogQL query with optional workspace isolation
      const filters: string[] = [];
      
      // Only filter by workspaceId if logs have it (application logs with structured logging)
      // Skip for basic Docker logs that don't have workspace context
      if (workspaceId) {
        filters.push(`workspaceId="${workspaceId}"`);
      }
      
      if (service) filters.push(`service="${service}"`);
      if (level) filters.push(`level="${level}"`);
      if (requestId) filters.push(`requestId="${requestId}"`);
      if (topic) filters.push(`topic="${topic}"`);

      // Query all containers, parse as JSON, and filter
      // Use | json to parse structured logs (will skip non-JSON lines)
      const logqlQuery = filters.length > 0 
        ? `{container=~".+"} | json | line_format "{{.msg}}" | ${filters.join(' | ')}`
        : `{container=~".+"}  | json`;

      log.debug({ logqlQuery, workspaceId, filters }, 'executing log query');

      log.debug({ logqlQuery, workspaceId }, 'executing log query');

      const result = await lokiClient.queryRange({
        query: logqlQuery,
        start: typeof since === 'string' ? since : '-1h',
        end: typeof until === 'string' ? until : undefined,
        limit: Math.min(Number(limit), 1000),
        direction: 'backward'
      });

      res.json(result);
    } catch (error) {
      log.error({ err: error }, 'failed to query logs');
      res.status(500).json({ 
        error: 'Failed to query logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
