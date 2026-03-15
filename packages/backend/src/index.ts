import { createApp } from './app.js';
import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { initEmailTransport } from './lib/email.js';
import { bootstrapAdmin } from './bootstrap.js';

const app = createApp();

async function startup() {
  // Initialize email transport (required for OTP and invitations)
  try {
    await initEmailTransport();
  } catch (err) {
    if (config.nodeEnv === 'production') {
      logger.error({ err }, 'Email transport initialization failed — refusing to start in production');
      process.exit(1);
    }
    logger.warn({ err }, 'Email not configured — OTP/invitation emails will not be sent');
  }

  // Bootstrap admin from ADMIN_EMAIL
  await bootstrapAdmin();

  app.listen(config.port, () => {
    logger.info(`IPIS backend listening on port ${config.port}`);
  });
}

startup().catch((err) => {
  logger.error({ err }, 'Startup failed');
  process.exit(1);
});
