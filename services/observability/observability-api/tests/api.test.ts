import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('observability-api', () => {
  const app = createApp();

  it('health endpoint returns ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  it('logs endpoint requires authentication', async () => {
    const res = await request(app).get('/api/logs?since=-1h');
    assert.equal(res.status, 401);
    assert.ok(res.body.error);
  });

  it('logs endpoint rejects invalid token', async () => {
    const res = await request(app)
      .get('/api/logs?since=-1h')
      .set('Authorization', 'Bearer invalid-token');
    assert.equal(res.status, 401);
    assert.ok(res.body.error);
  });
});
