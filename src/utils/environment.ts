import logger from './logger';

/**
 * Determines the current environment based on configuration
 * @returns "test" when USE_MOCK_API is true, "development" or "production" based on NODE_ENV
 */
export function getCurrentEnvironment(): 'test' | 'development' | 'production' {
  // If using mock API, we're in test mode
  if (process.env.USE_MOCK_API === 'true') {
    return 'test';
  }

  // Otherwise use NODE_ENV to determine environment
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production') {
    return 'production';
  }

  return 'development';
}

/**
 * Logs the current environment for debugging
 */
export function logEnvironment(): void {
  const env = getCurrentEnvironment();
  logger.info(`🔧 Running in ${env} environment`);
  logger.info(`   USE_MOCK_API: ${process.env.USE_MOCK_API || 'false'}`);
  logger.info(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
}
