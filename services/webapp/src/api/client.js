'use client';

import axiosInstance from 'src/lib/axios';

export async function listClients(signal) {
  try {
    const res = await axiosInstance.get('/api/clients', { signal });
    const items = Array.isArray(res.data?.items) ? res.data.items : [];
    return items.map((c) => ({
      id: c._id ?? c.id,
      name: c.name ?? 'Untitled client',
      status: c.status ?? 'unknown',
      allowedScopes: Array.isArray(c.allowedScopes) ? c.allowedScopes : [],
      allowedTopics: Array.isArray(c.allowedTopics) ? c.allowedTopics : [],
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

export async function createClient(payload) {
  const res = await axiosInstance.post('/api/clients', payload);
  return res.data;
}

export async function updateClient(id, payload) {
  if (!id) throw new Error('Client id is required');
  const res = await axiosInstance.put(`/api/clients/${id}`, payload);
  return res.data;
}

export async function getClient(id, signal) {
  if (!id) throw new Error('Client id is required');
  try {
    const res = await axiosInstance.get(`/api/clients/${id}`, { signal });
    const c = res.data ?? {};
    return {
      id: c._id ?? c.id ?? id,
      name: c.name ?? 'Untitled client',
      status: c.status ?? 'unknown',
      allowedScopes: Array.isArray(c.allowedScopes) ? c.allowedScopes : [],
      allowedTopics: Array.isArray(c.allowedTopics) ? c.allowedTopics : [],
      secretHash: c.secretHash,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  } catch (err) {
    if (err?.response?.status === 404) {
      throw new Error('Client not found');
    }
    throw err;
  }
}
