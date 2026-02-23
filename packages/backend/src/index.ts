import { createApp } from './app.js';
import { config } from './lib/config.js';
import { logger } from './lib/logger.js';

const app = createApp();

app.listen(config.port, () => {
  logger.info(`IPIS backend listening on port ${config.port}`);
});
