import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor(config: ConfigService) {
        super({
            datasourceUrl: config.get('postgresUri'),
        });
    }
    async onModuleInit() {
        await this.$connect();
        console.log('Prisma connected to database!');
    }
}
