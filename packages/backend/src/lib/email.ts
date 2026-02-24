import { logger } from './logger.js';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  body: string;
}

// Lazy singleton — reuse SES client across calls as AWS SDK recommends
let sesModule: typeof import('@aws-sdk/client-ses') | null = null;
let sesClient: InstanceType<typeof import('@aws-sdk/client-ses').SESClient> | null = null;

async function getSes() {
  if (!sesModule) {
    sesModule = await import('@aws-sdk/client-ses');
  }
  if (!sesClient) {
    sesClient = new sesModule.SESClient({});
  }
  return { client: sesClient, SendEmailCommand: sesModule.SendEmailCommand };
}

export async function sendEmail({ to, subject, body }: SendEmailParams): Promise<void> {
  const fromEmail = process.env['AWS_SES_FROM_EMAIL'];

  if (!fromEmail) {
    logger.info({ to, subject }, 'Email skipped (AWS_SES_FROM_EMAIL not configured — dev mode)');
    return;
  }

  const { client, SendEmailCommand } = await getSes();
  const recipients = Array.isArray(to) ? to : [to];

  const command = new SendEmailCommand({
    Source: fromEmail,
    Destination: { ToAddresses: recipients },
    Message: {
      Subject: { Data: subject },
      Body: { Text: { Data: body } },
    },
  });

  await client.send(command);
  logger.info({ to, subject }, 'Email sent via SES');
}
