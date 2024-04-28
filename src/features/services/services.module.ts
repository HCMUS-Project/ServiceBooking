import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';

@Module({
    imports: [PrismaModule],
    controllers: [ServicesController],
    providers: [ServicesService],
})
export class ServicesModule {}
