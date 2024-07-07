import { RegisterQueueOptions } from '@nestjs/bullmq';

/**
 * Configuration options for registering queues.
 */
const queueRegisterConfigs: Record<string, RegisterQueueOptions> = {
    booking: {
        /**
         * The name of the queue.
         */
        name: 'booking',
        sharedConnection: true,
    },
};

export default queueRegisterConfigs;
