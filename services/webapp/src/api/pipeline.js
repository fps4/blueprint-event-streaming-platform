'use client';

import axiosInstance from 'src/lib/axios';

export async function listPipelines(workspaceId, signal) {
  if (!workspaceId) throw new Error('Workspace id is required');
  try {
    const res = await axiosInstance.get(`/api/workspaces/${workspaceId}/pipelines`, { signal });
    const items = Array.isArray(res.data?.items) ? res.data.items : [];
    return items.map((p) => ({
      id: p._id ?? p.id,
      name: p.name ?? 'Untitled pipeline',
      status: p.status ?? 'unknown',
      description: p.description ?? '',
      sourceTopic: p.streams?.find?.((s) => s.type === 'source')?.topic ?? '',
      targetTopic: p.streams?.find?.((s) => s.type === 'sink')?.topic ?? '',
    }));
  } catch (err) {
    if (err?.response?.status === 404) {
      return [];
    }
    throw err;
  }
}
