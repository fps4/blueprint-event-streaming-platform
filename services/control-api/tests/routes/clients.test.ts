import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';

test('client CRUD basic happy path', async () => {
  const mem = await MongoMemoryServer.create();
  process.env.MONGO_URI = mem.getUri().replace(/\/+$/, '');
  process.env.MONGO_DB = 'testdb';

  const app = createApp();

  // Create client
  const createRes = await request(app)
    .post('/api/clients')
    .send({
      id: 'client1',
      name: 'Test Client',
      status: 'active',
      allowedScopes: ['ingest:topic:orders.created', 'api:read'],
      allowedTopics: ['dev.ws-acme.orders.raw']
    });
  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.name, 'Test Client');
  assert.equal(createRes.body.status, 'active');
  assert.deepEqual(createRes.body.allowedScopes, ['ingest:topic:orders.created', 'api:read']);
  assert.deepEqual(createRes.body.allowedTopics, ['dev.ws-acme.orders.raw']);
  assert.ok(createRes.body.secretHash, 'secretHash should be generated');

  // List clients
  const listRes = await request(app).get('/api/clients');
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.items.length, 1);
  assert.equal(listRes.body.items[0].name, 'Test Client');

  // Get single client
  const getRes = await request(app).get('/api/clients/client1');
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.name, 'Test Client');
  assert.equal(getRes.body.status, 'active');
  assert.deepEqual(getRes.body.allowedScopes, ['ingest:topic:orders.created', 'api:read']);

  // Update client
  const updateRes = await request(app)
    .put('/api/clients/client1')
    .send({
      name: 'Updated Client',
      status: 'inactive',
      allowedScopes: ['api:read'],
      allowedTopics: ['prod.ws-acme.orders.enriched']
    });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.name, 'Updated Client');
  assert.equal(updateRes.body.status, 'inactive');
  assert.deepEqual(updateRes.body.allowedScopes, ['api:read']);
  assert.deepEqual(updateRes.body.allowedTopics, ['prod.ws-acme.orders.enriched']);

  // Verify update persisted
  const getUpdatedRes = await request(app).get('/api/clients/client1');
  assert.equal(getUpdatedRes.status, 200);
  assert.equal(getUpdatedRes.body.name, 'Updated Client');
  assert.equal(getUpdatedRes.body.status, 'inactive');

  await mongoose.disconnect();
  await mem.stop();
});

test('client creation requires name', async () => {
  const mem = await MongoMemoryServer.create();
  process.env.MONGO_URI = mem.getUri().replace(/\/+$/, '');
  process.env.MONGO_DB = 'testdb';

  const app = createApp();

  const createRes = await request(app)
    .post('/api/clients')
    .send({
      status: 'active'
    });
  assert.equal(createRes.status, 400);
  assert.equal(createRes.body.error, 'name is required');

  await mongoose.disconnect();
  await mem.stop();
});

test('client update validates status enum', async () => {
  const mem = await MongoMemoryServer.create();
  process.env.MONGO_URI = mem.getUri().replace(/\/+$/, '');
  process.env.MONGO_DB = 'testdb';

  const app = createApp();

  // Create a client first
  await request(app)
    .post('/api/clients')
    .send({
      id: 'client2',
      name: 'Test Client 2'
    });

  // Try to update with invalid status
  const updateRes = await request(app)
    .put('/api/clients/client2')
    .send({
      status: 'invalid-status'
    });
  assert.equal(updateRes.status, 400);
  assert.equal(updateRes.body.error, 'status must be active|inactive');

  await mongoose.disconnect();
  await mem.stop();
});

test('client get returns 404 for non-existent client', async () => {
  const mem = await MongoMemoryServer.create();
  process.env.MONGO_URI = mem.getUri().replace(/\/+$/, '');
  process.env.MONGO_DB = 'testdb';

  const app = createApp();

  const getRes = await request(app).get('/api/clients/nonexistent');
  assert.equal(getRes.status, 404);
  assert.equal(getRes.body.error, 'client not found');

  await mongoose.disconnect();
  await mem.stop();
});

test('client update returns 404 for non-existent client', async () => {
  const mem = await MongoMemoryServer.create();
  process.env.MONGO_URI = mem.getUri().replace(/\/+$/, '');
  process.env.MONGO_DB = 'testdb';

  const app = createApp();

  const updateRes = await request(app)
    .put('/api/clients/nonexistent')
    .send({
      name: 'Updated'
    });
  assert.equal(updateRes.status, 404);
  assert.equal(updateRes.body.error, 'client not found');

  await mongoose.disconnect();
  await mem.stop();
});

test('client creation auto-generates UUID if not provided', async () => {
  const mem = await MongoMemoryServer.create();
  process.env.MONGO_URI = mem.getUri().replace(/\/+$/, '');
  process.env.MONGO_DB = 'testdb';

  const app = createApp();

  const createRes = await request(app)
    .post('/api/clients')
    .send({
      name: 'Auto ID Client'
    });
  assert.equal(createRes.status, 201);
  assert.ok(createRes.body._id, 'should have auto-generated ID');
  assert.match(createRes.body._id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'should be UUID format');

  await mongoose.disconnect();
  await mem.stop();
});

test('client list returns empty array when no clients exist', async () => {
  const mem = await MongoMemoryServer.create();
  process.env.MONGO_URI = mem.getUri().replace(/\/+$/, '');
  process.env.MONGO_DB = 'testdb';

  const app = createApp();

  const listRes = await request(app).get('/api/clients');
  assert.equal(listRes.status, 200);
  assert.deepEqual(listRes.body.items, []);

  await mongoose.disconnect();
  await mem.stop();
});

test('client partial update only modifies specified fields', async () => {
  const mem = await MongoMemoryServer.create();
  process.env.MONGO_URI = mem.getUri().replace(/\/+$/, '');
  process.env.MONGO_DB = 'testdb';

  const app = createApp();

  // Create client
  await request(app)
    .post('/api/clients')
    .send({
      id: 'client3',
      name: 'Original Name',
      status: 'active',
      allowedScopes: ['scope1', 'scope2'],
      allowedTopics: ['topic1']
    });

  // Update only name
  const updateRes = await request(app)
    .put('/api/clients/client3')
    .send({
      name: 'New Name'
    });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.name, 'New Name');
  assert.equal(updateRes.body.status, 'active'); // should remain unchanged
  assert.deepEqual(updateRes.body.allowedScopes, ['scope1', 'scope2']); // should remain unchanged
  assert.deepEqual(updateRes.body.allowedTopics, ['topic1']); // should remain unchanged

  await mongoose.disconnect();
  await mem.stop();
});
