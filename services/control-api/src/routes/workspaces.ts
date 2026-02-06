import { randomUUID } from 'crypto';
import { Router } from 'express';
import { makeModels } from '@event-streaming-platform/data-models';
import { getConnection } from '../lib/db.js';
import { log, toId } from './helpers.js';
import { generateUniqueCode } from '../lib/code-generator.js';

export function workspaceRoutes() {
  const router = Router();

  router.get('/workspaces', async (_req, res) => {
    const conn = await getConnection();
    const { Workspace } = makeModels(conn);
    const items = await Workspace.find({}).lean().exec();
    res.json({ items });
  });

  router.get('/workspaces/:id', async (req, res) => {
    const conn = await getConnection();
    const { Workspace } = makeModels(conn);
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id is required' });
    const ws = await Workspace.findById(id).lean().exec();
    if (!ws) return res.status(404).json({ error: 'workspace not found' });
    res.json(ws);
  });

  router.post('/workspaces', async (req, res) => {
    const conn = await getConnection();
    const { Workspace } = makeModels(conn);
    const providedId = toId(req.body?.id || req.body?._id);
    const _id = providedId || randomUUID();
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const allowedOrigins = Array.isArray(req.body?.allowedOrigins)
      ? (req.body.allowedOrigins as unknown[]).map((v: unknown) => String(v ?? '').trim()).filter(Boolean)
      : [];
    if (!name) return res.status(400).json({ error: 'name is required' });
    
    const code = await generateUniqueCode(Workspace);
    const created = await Workspace.create({ _id, name, code, description, status: 'active', allowedOrigins });
    log.info({ workspaceId: _id, code }, 'workspace created');
    res.status(201).json(created);
  });

  router.put('/workspaces/:id', async (req, res) => {
    const conn = await getConnection();
    const { Workspace } = makeModels(conn);
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id is required' });
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const allowedOrigins = Array.isArray(req.body?.allowedOrigins)
      ? (req.body.allowedOrigins as unknown[]).map((v: unknown) => String(v ?? '').trim()).filter(Boolean)
      : [];
    if (!name) return res.status(400).json({ error: 'name is required' });
    const updated = await Workspace.findByIdAndUpdate(
      id,
      { name, description, allowedOrigins },
      { new: true }
    )
      .lean()
      .exec();
    if (!updated) return res.status(404).json({ error: 'workspace not found' });
    log.info({ workspaceId: id }, 'workspace updated');
    res.json(updated);
  });

  return router;
}
