import { ConnectionOptions, QueueOptions } from 'bullmq';

/**
 * Configuration for the BullMQ queue.
 */
const config: QueueOptions = {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASS || '',
        db: process.env.REDIS_DB || 0,
        user: process.env.REDIS_USER || '',
    } as ConnectionOptions,
    prefix: process.env.REDIS_PREFIX || 'bullmq',
};

export default config;
