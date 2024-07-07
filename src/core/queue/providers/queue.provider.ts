import { SharedBullConfigurationFactory } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { QueueOptions } from 'bullmq';
import configQueue from '../configs/queue.config';

/**
 * Represents a QueueProvider that implements the SharedBullConfigurationFactory interface.
 * This class is responsible for creating a shared configuration for the queue.
 */
@Injectable()
export class QueueProvider implements SharedBullConfigurationFactory {
    /**
     * Creates a shared configuration for the queue.
     * @returns The created QueueOptions configuration.
     */
    createSharedConfiguration(): QueueOptions {
        return configQueue;
    }
}
