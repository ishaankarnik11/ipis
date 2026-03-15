function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env['PORT'] || '3000', 10),
  databaseUrl: requireEnv('DATABASE_URL'),
  get jwtSecret(): string {
    return requireEnv('JWT_SECRET');
  },
  get internalServiceSecret(): string {
    return process.env['INTERNAL_SERVICE_SECRET'] || 'dev-internal-secret-change-in-production';
  },
  logLevel: process.env['LOG_LEVEL'] || 'info',
  nodeEnv: process.env['NODE_ENV'] || 'development',
  frontendUrl: process.env['FRONTEND_URL'] || 'http://localhost:5173',
  smtp: {
    host: process.env['SMTP_HOST'] || '',
    port: parseInt(process.env['SMTP_PORT'] || '587', 10),
    user: process.env['SMTP_USER'] || '',
    pass: process.env['SMTP_PASS'] || '',
    from: process.env['SMTP_FROM'] || '',
  },
  masterOtp: process.env['MASTER_OTP'] || '',
} as const;
