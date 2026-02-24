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
  logLevel: process.env['LOG_LEVEL'] || 'info',
  nodeEnv: process.env['NODE_ENV'] || 'development',
  frontendUrl: process.env['FRONTEND_URL'] || 'http://localhost:5173',
} as const;
