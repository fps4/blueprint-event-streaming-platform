import { componentLogger } from './logger.js';

const log = componentLogger('loki-client');

export interface LokiQueryParams {
  query: string;
  start?: string;
  end?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface LokiLogEntry {
  timestamp: string;
  level?: string;
  service?: string;
  requestId?: string;
  workspaceId?: string;
  topic?: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface LokiQueryResponse {
  logs: LokiLogEntry[];
  total: number;
  hasMore: boolean;
}

export class LokiClient {
  constructor(private readonly baseUrl: string) {}

  async queryRange(params: LokiQueryParams): Promise<LokiQueryResponse> {
    const url = new URL('/loki/api/v1/query_range', this.baseUrl);
    url.searchParams.set('query', params.query);
    
    // Convert relative time to nanoseconds timestamp
    if (params.start) {
      const startTime = this.parseRelativeTime(params.start);
      url.searchParams.set('start', startTime);
    }
    if (params.end) {
      const endTime = this.parseRelativeTime(params.end);
      url.searchParams.set('end', endTime);
    }
    if (params.limit) url.searchParams.set('limit', String(params.limit));
    if (params.direction) url.searchParams.set('direction', params.direction);

    log.debug({ url: url.toString(), query: params.query }, 'querying Loki');

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        log.error({ status: response.status, error: errorText }, 'Loki query failed');
        throw new Error(`Loki query failed: ${response.status} ${errorText}`);
      }

      const data = await response.json() as any;
      const logs = this.parseLokiResponse(data);
      
      return {
        logs,
        total: logs.length,
        hasMore: logs.length === (params.limit || 100)
      };
    } catch (error) {
      log.error({ err: error }, 'failed to query Loki');
      throw error;
    }
  }

  private parseLokiResponse(data: any): LokiLogEntry[] {
    if (!data?.data?.result) return [];

    const logs: LokiLogEntry[] = [];
    
    for (const stream of data.data.result) {
      const labels = stream.stream || {};
      
      for (const [timestampNs, logLine] of stream.values || []) {
        try {
          const parsed = JSON.parse(logLine);
          logs.push({
            timestamp: new Date(Number(timestampNs) / 1000000).toISOString(),
            level: parsed.level,
            service: parsed.service || labels.service,
            requestId: parsed.requestId,
            workspaceId: parsed.workspaceId,
            topic: parsed.topic,
            message: parsed.msg || parsed.message || logLine,
            metadata: this.extractMetadata(parsed)
          });
        } catch {
          // Non-JSON log line, return as plain text
          logs.push({
            timestamp: new Date(Number(timestampNs) / 1000000).toISOString(),
            service: labels.service,
            message: logLine,
          });
        }
      }
    }

    return logs.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  private extractMetadata(parsed: any): Record<string, any> | undefined {
    const { level, time, msg, message, service, requestId, workspaceId, topic, ...rest } = parsed;
    return Object.keys(rest).length > 0 ? rest : undefined;
  }

  private parseRelativeTime(time: string): string {
    // If already a timestamp, return as-is
    if (/^\d+$/.test(time)) {
      return time;
    }

    // Parse relative time like -1h, -5m, -30s
    const match = time.match(/^-(\d+)([smhd])$/);
    if (!match) {
      // If not relative, assume it's ISO 8601 and convert to nanoseconds
      const date = new Date(time);
      return String(date.getTime() * 1_000_000);
    }

    const [, amount, unit] = match;
    const now = Date.now();
    let milliseconds = 0;

    switch (unit) {
      case 's':
        milliseconds = parseInt(amount) * 1000;
        break;
      case 'm':
        milliseconds = parseInt(amount) * 60 * 1000;
        break;
      case 'h':
        milliseconds = parseInt(amount) * 60 * 60 * 1000;
        break;
      case 'd':
        milliseconds = parseInt(amount) * 24 * 60 * 60 * 1000;
        break;
    }

    // Return nanoseconds timestamp
    return String((now - milliseconds) * 1_000_000);
  }
}
