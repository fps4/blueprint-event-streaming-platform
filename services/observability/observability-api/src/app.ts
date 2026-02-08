import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { CONFIG } from './config/index.js';
import { buildRouter } from './routes/index.js';
import { componentLogger } from './lib/logger.js';

const log = componentLogger('server');
const httpLog = componentLogger('http');

function requestLoggingMiddleware(): express.RequestHandler {
  return (req, res, next) => {
    const requestId = String(req.header('x-request-id') || randomUUID());
    const start = Date.now();

    const child = httpLog.child({ requestId, method: req.method, path: req.originalUrl });
    child.info({ userAgent: req.header('user-agent') }, 'request started');

    res.on('finish', () => {
      child.info({
        status: res.statusCode,
        durationMs: Date.now() - start,
        contentLength: res.getHeader('content-length') ?? undefined
      }, 'request completed');
    });

    res.on('error', (err) => {
      child.error({ err }, 'response stream error');
    });

    next();
  };
}

export function createApp() {
  const app = express();
  const corsAllowlist = CONFIG.corsOrigins;
  const corsOptions: cors.CorsOptions = {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (corsAllowlist.length === 0 || corsAllowlist.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(requestLoggingMiddleware());
  app.use(express.json());
  app.use('/api', buildRouter());
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  
  return app;
}
