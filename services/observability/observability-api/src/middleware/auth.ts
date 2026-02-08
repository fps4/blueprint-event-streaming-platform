import type { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet, JWTVerifyResult } from 'jose';
import { createSecretKey } from 'crypto';
import { CONFIG } from '../config/index.js';
import { componentLogger } from '../lib/logger.js';

const log = componentLogger('auth');

export interface JwtClaims {
  sid: string;           // sessionId
  pid: string;           // principalId
  ptyp: string;          // principalType (user|client)
  wid?: string;          // workspaceId
  scopes: string[];      // permissions
  topics?: string[];     // allowed topics
  iss: string;           // issuer
  aud: string;           // audience
  exp: number;           // expiration
  iat: number;           // issued at
  jti: string;           // JWT ID
}

declare global {
  namespace Express {
    interface Request {
      jwt?: JwtClaims;
      workspaceId?: string;
    }
  }
}

export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.header('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const secret = createSecretKey(Buffer.from(CONFIG.jwtSecret, 'utf-8'));
      const { payload } = await jwtVerify(token, secret, {
        issuer: CONFIG.jwtIssuer,
        audience: CONFIG.jwtAudience,
      }) as JWTVerifyResult & { payload: JwtClaims };

      req.jwt = payload;
      req.workspaceId = payload.wid;

      log.debug({ 
        principalId: payload.pid, 
        workspaceId: payload.wid,
        scopes: payload.scopes 
      }, 'JWT verified');

      next();
    } catch (error) {
      log.warn({ err: error }, 'JWT verification failed');
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  };
}

export function requireWorkspace() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.workspaceId) {
      res.status(403).json({ error: 'Workspace context required' });
      return;
    }
    next();
  };
}
