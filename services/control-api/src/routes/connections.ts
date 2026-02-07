import { randomUUID } from 'crypto';
import { Router } from 'express';
import { makeModels } from '@event-streaming-platform/data-models';
import { getConnection } from '../lib/db.js';
import { log, toId } from './helpers.js';

export function connectionRoutes() {
  const router = Router();

  router.get('/connections', async (_req, res) => {
    const conn = await getConnection();
    const { Connection } = makeModels(conn);
    const items = await Connection.find({}).lean().exec();
    res.json({ items });
  });

  router.get('/connections/:connectionId', async (req, res) => {
    const conn = await getConnection();
    const { Connection } = makeModels(conn);
    const _id = toId(req.params.connectionId);
    if (!_id) return res.status(400).json({ error: 'connectionId is required' });
    
    const doc = await Connection.findOne({ _id }).lean().exec();
    if (!doc) return res.status(404).json({ error: 'connection not found' });
    
    res.json(doc);
  });

  router.post('/connections', async (req, res) => {
    const conn = await getConnection();
    const { Connection } = makeModels(conn);
    const _id = randomUUID();
    const name = String(req.body?.name || '').trim();
    const type = req.body?.type;
    const config = req.body?.config || {};
    const description = String(req.body?.description || '');
    
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!type || (type !== 'HTTP' && type !== 'S3')) {
      return res.status(400).json({ error: 'type must be HTTP or S3' });
    }

    // Validate config based on type
    if (type === 'HTTP' && !config.url) {
      return res.status(400).json({ error: 'config.url is required for HTTP connections' });
    }
    if (type === 'S3' && !config.bucket) {
      return res.status(400).json({ error: 'config.bucket is required for S3 connections' });
    }

    const created = await Connection.create({
      _id,
      name,
      type,
      config,
      description,
      status: 'active'
    });
    
    log.info({ connectionId: _id, type }, 'connection created');
    res.status(201).json(created);
  });

  router.put('/connections/:connectionId', async (req, res) => {
    const conn = await getConnection();
    const { Connection } = makeModels(conn);
    const _id = toId(req.params.connectionId);
    if (!_id) return res.status(400).json({ error: 'connectionId is required' });

    const updates: Record<string, unknown> = {};

    if (req.body?.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ error: 'name cannot be empty' });
      updates.name = name;
    }

    if (req.body?.type !== undefined) {
      const type = req.body.type;
      if (type !== 'HTTP' && type !== 'S3') {
        return res.status(400).json({ error: 'type must be HTTP or S3' });
      }
      updates.type = type;
    }

    if (req.body?.status !== undefined) {
      const status = req.body.status;
      if (status !== 'active' && status !== 'inactive') {
        return res.status(400).json({ error: 'status must be active or inactive' });
      }
      updates.status = status;
    }

    if (req.body?.config !== undefined) {
      updates.config = req.body.config;
    }

    if (req.body?.description !== undefined) {
      updates.description = String(req.body.description || '');
    }

    const doc = await Connection.findOneAndUpdate(
      { _id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).lean().exec();

    if (!doc) return res.status(404).json({ error: 'connection not found' });
    
    log.info({ connectionId: _id }, 'connection updated');
    res.json(doc);
  });

  router.delete('/connections/:connectionId', async (req, res) => {
    const conn = await getConnection();
    const { Connection } = makeModels(conn);
    const _id = toId(req.params.connectionId);
    if (!_id) return res.status(400).json({ error: 'connectionId is required' });

    const doc = await Connection.findOneAndDelete({ _id }).lean().exec();
    if (!doc) return res.status(404).json({ error: 'connection not found' });
    
    log.info({ connectionId: _id }, 'connection deleted');
    res.status(204).end();
  });

  return router;
}
