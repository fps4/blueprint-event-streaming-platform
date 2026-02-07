'use client';

import axiosInstance from 'src/lib/axios';

export async function listConnections(signal) {
  try {
    const res = await axiosInstance.get('/api/connections', { signal });
    const items = Array.isArray(res.data?.items) ? res.data.items : [];
    return items.map((c) => ({
      id: c._id ?? c.id,
      name: c.name ?? 'Untitled connection',
      type: c.type ?? 'HTTP',
      status: c.status ?? 'unknown',
      config: c.config || {},
      description: c.description ?? '',
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  } catch (err) {
    if (err?.response?.status === 404) {
      return [];
    }
    throw err;
  }
}

export async function createConnection(payload) {
  const res = await axiosInstance.post('/api/connections', payload);
  return res.data;
}

export async function updateConnection(id, payload) {
  if (!id) throw new Error('Connection id is required');
  const res = await axiosInstance.put(`/api/connections/${id}`, payload);
  return res.data;
}

export async function getConnection(id, signal) {
  if (!id) throw new Error('Connection id is required');
  try {
    const res = await axiosInstance.get(`/api/connections/${id}`, { signal });
    const c = res.data ?? {};
    return {
      id: c._id ?? c.id ?? id,
      name: c.name ?? 'Untitled connection',
      type: c.type ?? 'HTTP',
      status: c.status ?? 'unknown',
      config: c.config || {},
      description: c.description ?? '',
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  } catch (err) {
    if (err?.response?.status === 404) {
      throw new Error('Connection not found');
    }
    throw err;
  }
}

export async function deleteConnection(id) {
  if (!id) throw new Error('Connection id is required');
  await axiosInstance.delete(`/api/connections/${id}`);
}
