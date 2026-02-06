import { randomUUID } from 'crypto';
import { Router } from 'express';
import { makeModels } from '@event-streaming-platform/data-models';
import { getConnection } from '../lib/db.js';
import { log, toId } from './helpers.js';

export function clientRoutes() {
  const router = Router({ mergeParams: true });

  router.get('/clients', async (_req, res) => {
    const conn = await getConnection();
    const { Client } = makeModels(conn);
    const items = await Client.find({}).lean().exec();
    res.json({ items });
  });

  router.get('/clients/:clientId', async (req, res) => {
    const conn = await getConnection();
    const { Client } = makeModels(conn);
    const _id = toId(req.params.clientId);
    if (!_id) return res.status(400).json({ error: 'clientId is required' });
    
    const doc = await Client.findOne({ _id }).lean().exec();
    if (!doc) return res.status(404).json({ error: 'client not found' });
    
    res.json(doc);
  });

  router.post('/clients', async (req, res) => {
    const conn = await getConnection();
    const { Client } = makeModels(conn);
    const _id = req.body?.id || req.body?._id || randomUUID();
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });

    const secretHash = String(req.body?.secretHash || randomUUID());
    const doc = await Client.create({
      _id,
      name,
      status: req.body?.status || 'active',
      secretHash,
      secretSalt: req.body?.secretSalt ?? null,
      allowedScopes: Array.isArray(req.body?.allowedScopes) ? req.body.allowedScopes : [],
      allowedTopics: Array.isArray(req.body?.allowedTopics) ? req.body.allowedTopics : []
    });
    log.info({ clientId: _id }, 'client created');
    res.status(201).json(doc);
  });

  router.put('/clients/:clientId', async (req, res) => {
    const conn = await getConnection();
    const { Client } = makeModels(conn);
    const _id = toId(req.params.clientId);
    if (!_id) return res.status(400).json({ error: 'clientId is required' });

    const updates: Record<string, unknown> = {};

    if (req.body?.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ error: 'name cannot be empty' });
      updates.name = name;
    }

    if (req.body?.status !== undefined) {
      const status = req.body.status;
      if (status !== 'active' && status !== 'inactive') {
        return res.status(400).json({ error: 'status must be active|inactive' });
      }
      updates.status = status;
    }

    if (req.body?.allowedScopes !== undefined) {
      if (!Array.isArray(req.body.allowedScopes)) return res.status(400).json({ error: 'allowedScopes must be an array' });
      updates.allowedScopes = req.body.allowedScopes;
    }

    if (req.body?.allowedTopics !== undefined) {
      if (!Array.isArray(req.body.allowedTopics)) return res.status(400).json({ error: 'allowedTopics must be an array' });
      updates.allowedTopics = req.body.allowedTopics;
    }

    const doc = await Client.findOneAndUpdate(
      { _id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).lean().exec();

    if (!doc) return res.status(404).json({ error: 'client not found' });

    log.info({ clientId: _id }, 'client updated');
    res.json(doc);
  });

  return router;
}
