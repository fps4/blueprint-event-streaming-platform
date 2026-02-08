import { CONFIG } from './config/index.js';
import { createApp } from './app.js';
import { componentLogger } from './lib/logger.js';

const log = componentLogger('server');

export function start() {
  const app = createApp();
  app.listen(CONFIG.port, () => {
    log.info({ port: CONFIG.port, lokiUrl: CONFIG.lokiUrl }, 'observability-api listening');
  });
}

start();
