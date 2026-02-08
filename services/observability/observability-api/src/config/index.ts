import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  port: Number(process.env.OBSERVABILITY_API_PORT || process.env.PORT || 4040),
  lokiUrl: process.env.LOKI_URL || 'http://localhost:3100',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  jwtSecret: process.env.AUTH_JWT_SECRET || '',
  jwtIssuer: process.env.AUTH_JWT_ISSUER || 'authorizer',
  jwtAudience: process.env.AUTH_JWT_AUDIENCE || 'event-streaming-platform',
} as const;
