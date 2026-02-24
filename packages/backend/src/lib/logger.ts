import pino from 'pino';

export const logger = pino({
  level: process.env['LOG_LEVEL'] || 'info',
  redact: ['req.headers.authorization', '*.password', '*.passwordHash', '*.ctc', '*.billingRate', '*.annualCtcPaise', '*.annual_ctc_paise', '*.contractValuePaise', '*.contract_value_paise', '*.billingRatePaise', '*.billing_rate_paise'],
});
